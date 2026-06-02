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
 * - verify_implementation：读 artifacts + 组装 5 维度模板 + 提示 Oracle 执行 git diff
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
import {
  sync_tasks_from_plan,
  prepare_verification_context as verify_implementation,
} from "../omo-spec"

function verifyArgs(changeName: string, t: string) {
  return {
    change_name: changeName,
    paths: [join(t, "openspec", "changes", changeName, "proposal.md")],
  }
}

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

// ============================================================
// verify_implementation 集成测试
// (Oracle review 🟡 #2)
//
// 注意：tool 已经移除 captureGitDiff。
// 验证的是「新行为」：
// 1. 输出包含「请 Oracle 自行执行 git diff」的提示
// 2. 输出包含 5 维度模板
// 3. 输出包含 artifacts 内容
// 4. 输出不包含 "Changed files:"（因为 tool 不再捕获）
// ============================================================

describe("verify_implementation 集成测试", () => {
  /** 创建最小 fixtures：proposal/design/specs/plan */
  function setupChangeFixtures(changeName: string) {
    const changeDir = join(tmp, "openspec", "changes", changeName)
    const specsDir = join(changeDir, "specs", "user-auth")
    mkdirSync(specsDir, { recursive: true })
    writeFileSync(
      join(changeDir, "proposal.md"),
      "# Proposal\n\n## Why\nTest motivation\n"
    )
    writeFileSync(
      join(changeDir, "design.md"),
      "# Design\n\n## Decisions\nTest decision\n"
    )
    writeFileSync(
      join(specsDir, "spec.md"),
      "### Requirement: test\nThe system MUST work.\n"
    )
    // plan 放在 .omo/plans/
    const plansDir = join(tmp, ".omo", "plans")
    mkdirSync(plansDir, { recursive: true })
    writeFileSync(
      join(plansDir, `${changeName}.md`),
      "## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n"
    )
  }

  test("输出包含 Oracle 自行执行 git diff 的提示（新行为）", async () => {
    setupChangeFixtures("git-diff-prompt")

    const result = await (verify_implementation as any).execute(
      verifyArgs("git-diff-prompt", tmp),
      { directory: tmp }
    )

    // 关键断言 1：输出明确告诉 Oracle 自行执行 git diff
    expect(result.output).toContain("git diff --name-only HEAD")
    expect(result.output).toContain("git ls-files --others --exclude-standard")
    // 输出提到 "Oracle 自行执行"
    expect(result.output).toMatch(/Oracle.*自行执行|自行执行.*git diff/)
  })

  test("输出包含 5 维度模板", async () => {
    setupChangeFixtures("dim-template")

    const result = await (verify_implementation as any).execute(
      verifyArgs("dim-template", tmp),
      { directory: tmp }
    )

    // 5 维度名称都在
    expect(result.output).toContain("Spec 合规性")
    expect(result.output).toContain("Design 对齐")
    expect(result.output).toContain("Proposal 范围")
    expect(result.output).toContain("Task 完成度")
    expect(result.output).toContain("非功能性合规性")
    // 严重程度规则
    expect(result.output).toContain("BLOCKED")
    expect(result.output).toContain("CONDITIONAL")
  })

  test("输出包含所有 artifacts 内容", async () => {
    setupChangeFixtures("artifacts-content")

    const result = await (verify_implementation as any).execute(
      verifyArgs("artifacts-content", tmp),
      { directory: tmp }
    )

    // proposal 内容
    expect(result.output).toContain("Test motivation")
    // design 内容
    expect(result.output).toContain("Test decision")
    // specs 内容（拼接格式）
    expect(result.output).toContain("### user-auth")
    expect(result.output).toContain("MUST work")
    // plan 内容
    expect(result.output).toContain("## TODOs")
  })

  test("输出不再包含 'Changed files:' 列表（tool 已不再捕获）", async () => {
    setupChangeFixtures("no-changed-files")

    const result = await (verify_implementation as any).execute(
      verifyArgs("no-changed-files", tmp),
      { directory: tmp }
    )

    // 关键反向断言：tool 不再列出变更文件
    expect(result.output).not.toContain("Changed files:")
    // changedFiles 在 tool 输出里是空数组（占位），不应被列出
    expect(result.output).not.toMatch(/Changed files: \d+/)
  })

  test("artifacts 缺失时不报错（返回 null 字段，Oracle 自行判断）", async () => {
    // 不创建任何 artifacts
    const result = await (verify_implementation as any).execute(
      verifyArgs("no-artifacts", tmp),
      { directory: tmp }
    )

    // tool 仍然返回结构化输出
    expect(result.output).toContain("=== 实现验证上下文已准备")
    // 5 维度模板仍在（与 artifacts 无关）
    expect(result.output).toContain("Spec 合规性")
  })

  test("specs 目录不存在时不报错（B21 静态导入的鲁棒性）", async () => {
    const changeName = "no-specs-dir"
    const changeDir = join(tmp, "openspec", "changes", changeName)
    mkdirSync(changeDir, { recursive: true })
    // 只放 proposal，不放 specs/
    writeFileSync(join(changeDir, "proposal.md"), "# Proposal\n")
    // plan
    const plansDir = join(tmp, ".omo", "plans")
    mkdirSync(plansDir, { recursive: true })
    writeFileSync(
      join(plansDir, `${changeName}.md`),
      "## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n"
    )

    const result = await (verify_implementation as any).execute(
      verifyArgs(changeName, tmp),
      { directory: tmp }
    )

    expect(result.output).toContain("=== 实现验证上下文已准备")
    expect(result.output).toContain("# Proposal")
    // specs 段不存在（因为没创建 specs/ 目录）
    expect(result.output).not.toContain("## Specs")
  })
})
