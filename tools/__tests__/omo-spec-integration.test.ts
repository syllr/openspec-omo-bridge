#!/usr/bin/env bun test
/**
 * omo-spec 集成测试
 * (Oracle review ⚪ D31)
 *
 * 与单元测试的区别：
 * - 单元测试：只测纯函数（parseOmoPlan、generateOpenSpecTasks 等）
 * - 集成测试：实际调用 tool 的 execute()，涉及真实文件系统读写
 *
 * 覆盖：
 * - sync_tasks_from_plan：读 plan → 写 tasks.md
 * - 完整 round-trip：write plan → 读 plan → sync → 验证 tasks.md
 * - 错误路径：plan 不存在、change 目录不存在
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { sync_tasks_from_plan } from "../omo-spec"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "omo-integration-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

/**
 * 直接写 plan markdown（替代原 write_new_plan tool）
 * 模拟 AI 按 OMO 格式写 plan 的行为，使用编号格式（## 1. TL;DR）
 */
function writePlanFile(
  changeName: string,
  sections: {
    tldr: string
    context: string
    workObjectives: string
    verificationStrategy: string
    executionStrategy: string
    todos: string
    finalVerificationWave: string
    commitStrategy: string
    successCriteria: string
  }
): void {
  const plansDir = join(tmp, ".omo", "plans")
  mkdirSync(plansDir, { recursive: true })
  const content = [
    `## 1. TL;DR\n${sections.tldr}`,
    `## 2. Context\n${sections.context}`,
    `## 3. Work Objectives\n${sections.workObjectives}`,
    `## 4. Verification Strategy\n${sections.verificationStrategy}`,
    `## 5. Execution Strategy\n${sections.executionStrategy}`,
    `## 6. TODOs\n${sections.todos}`,
    `## 7. Final Verification Wave\n${sections.finalVerificationWave}`,
    `## 8. Commit Strategy\n${sections.commitStrategy}`,
    `## 9. Success Criteria\n${sections.successCriteria}`,
  ].join("\n\n")
  writeFileSync(join(plansDir, `${changeName}.md`), content)
}


// ============================================================
// 完整 round-trip 测试
// ============================================================

describe("完整 round-trip：write plan → sync → 验证", () => {
  test("含 3 个 task + 1 个 FVW 的 plan 完整流程", async () => {
    const changeName = "round-trip"

    // 1. 写 plan
    writePlanFile(changeName, {
      tldr: "Round-trip test",
      context: "Test context",
      workObjectives:
        "- **Must Have**: feature X\n- **Must NOT Have**: feature Y",
      verificationStrategy: "- Run tests",
      executionStrategy: "- Sequential",
      todos:
        "#### 1. [ ] step1\n- **What to do**: a\n- **Acceptance**: pass\n\n#### 2. [ ] step2\n- **What to do**: b\n\n#### 3. [ ] step3",
      finalVerificationWave: "### F1. [ ] final check",
      commitStrategy: "one commit per wave",
      successCriteria: "all tests pass",
    })
    mkdirSync(join(tmp, "openspec", "changes", changeName), { recursive: true })

    // 2. 同步到 tasks.md（batch API：无参，自动扫所有 plan）
    const syncResult = await (sync_tasks_from_plan as any).execute(
      {},
      { directory: tmp }
    )
    // 任务数 = 3 TODOs + 1 FVW = 4 总任务
    expect(syncResult.output).toContain("1 个 change 已同步")
    expect(syncResult.output).toContain("round-trip: 4 tasks (0 ✅)")
    expect(syncResult.output).toContain("2 waves")

    // 3. 验证 tasks.md 内容
    const tasksPath = join(
      tmp,
      "openspec",
      "changes",
      changeName,
      "tasks.md"
    )
    const content = readFileSync(tasksPath, "utf-8")

    // 3 个 task 都被 N.M 编号
    expect(content).toContain("- [ ] 1.1 step1")
    expect(content).toContain("- [ ] 1.2 step2")
    expect(content).toContain("- [ ] 1.3 step3")
    // 1 个 FVW
    expect(content).toContain("- [ ] 2.1 final check")
    // 字段被 6 空格缩进保留
    expect(content).toMatch(/      \*\*What to do\*\*: a/)
    // Plan Reference 包含全部 9 section
    expect(content).toContain("## Plan Reference")
    expect(content).toContain("### 1. TL;DR")
    expect(content).toContain("### 3. Work Objectives")
    expect(content).toContain("### 9. Success Criteria")

    // 4. 模拟 OMO 标记 task 完成，再次 sync
    const planPath = join(tmp, ".omo", "plans", `${changeName}.md`)
    const planContent = readFileSync(planPath, "utf-8")
    const updatedPlan = planContent
      .replace("#### 1. [ ] step1", "#### 1. [x] step1")
      .replace("#### 2. [ ] step2", "#### 2. [x] step2")
    writeFileSync(planPath, updatedPlan)

    // 5. 重新 sync（batch）
    const reSyncResult = await (sync_tasks_from_plan as any).execute(
      {},
      { directory: tmp }
    )
    expect(reSyncResult.output).toContain("round-trip: 4 tasks (2 ✅)")

    const updatedContent = readFileSync(tasksPath, "utf-8")
    // checkbox 状态被同步
    expect(updatedContent).toContain("- [x] 1.1 step1")
    expect(updatedContent).toContain("- [x] 1.2 step2")
    expect(updatedContent).toContain("- [ ] 1.3 step3")
  })
})
