#!/usr/bin/env bun test
/**
 * syncPlanToTasksFile 集成测试
 *
 * 与单元测试（parseOmoPlan / generateOpenSpecTasks）的区别：
 * - 单元测试：只测纯函数解析/生成逻辑
 * - 集成测试：syncPlanToTasksFile 端到端 fs 流程——写 plan → 同步 → 验证 tasks.md
 *
 * 不依赖 openspec CLI：syncPlanToTasksFile 是纯 fs 函数，CLI 包装在
 * scripts/sync-plan-to-tasks.ts 主流程里。
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
import { syncPlanToTasksFile } from "../sync-plan-to-tasks"

let tmp: string

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "omo-cli-integration-"))
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

function writePlan(changeName: string, content: string): string {
  const plansDir = join(tmp, ".omo", "plans")
  mkdirSync(plansDir, { recursive: true })
  const planPath = join(plansDir, `${changeName}.md`)
  writeFileSync(planPath, content)
  return planPath
}

const SAMPLE_PLAN = `## 1. TL;DR
Round-trip integration test
## 2. Context
Test context
## 3. Work Objectives
- **Must Have**: feature X
## 4. Verification Strategy
- Run tests
## 5. Execution Strategy
- Sequential
## 6. TODOs
#### 1. [ ] step1
- **What to do**: a
- **Acceptance**: pass
#### 2. [ ] step2
- **What to do**: b
#### 3. [ ] step3
## 7. Final Verification Wave
### F1. [ ] final check
## 8. Commit Strategy
one commit per wave
## 9. Success Criteria
all tests pass
`

describe("round-trip: write plan → sync → verify tasks.md", () => {
  test("含 3 个 task + 1 个 FVW 的 plan 完整流程", () => {
    const changeName = "round-trip"
    const changeRoot = join(tmp, "openspec", "changes", changeName)
    mkdirSync(changeRoot, { recursive: true })

    const planPath = writePlan(changeName, SAMPLE_PLAN)
    const { tasksContent, tasksFile } = syncPlanToTasksFile(planPath, changeRoot, changeName)

    expect(existsSync(tasksFile)).toBe(true)
    expect(tasksFile).toBe(join(changeRoot, "tasks.md"))

    // 3 个 task 都被 N.M 编号
    expect(tasksContent).toContain("- [ ] 1.1 step1")
    expect(tasksContent).toContain("- [ ] 1.2 step2")
    expect(tasksContent).toContain("- [ ] 1.3 step3")
    // 1 个 FVW — 无 checkbox
    expect(tasksContent).toContain("- 2.1 final check")
    // 字段被 6 空格缩进保留
    expect(tasksContent).toMatch(/      \*\*What to do\*\*: a/)
    // Plan Reference 包含全部 9 section
    expect(tasksContent).toContain("## Plan Reference")
    expect(tasksContent).toContain("### 1. TL;DR")
    expect(tasksContent).toContain("### 3. Work Objectives")
    expect(tasksContent).toContain("### 9. Success Criteria")
  })

  test("tasks.md 头注释明确告知镜像源", () => {
    const changeName = "header-check"
    const changeRoot = join(tmp, "openspec", "changes", changeName)
    mkdirSync(changeRoot, { recursive: true })

    const planPath = writePlan(
      changeName,
      `## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n`
    )
    const { tasksContent } = syncPlanToTasksFile(planPath, changeRoot, changeName)

    expect(tasksContent).toContain("> 本文件由 `.omo/plans/<change-name>.md` 镜像生成")
    expect(tasksContent).toContain("> 修改 plan 后重新运行同步 tool 即可更新")
    expect(tasksContent).toContain("> **不要手动编辑**")
  })
})

describe("checkbox 状态同步", () => {
  test("[x] 标记的 task 在 tasks.md 里也保持 [x]", () => {
    const changeName = "completed-tasks"
    const changeRoot = join(tmp, "openspec", "changes", changeName)
    mkdirSync(changeRoot, { recursive: true })

    const planPath = writePlan(
      changeName,
      `## TODOs\n#### 1. [x] done1\n#### 2. [x] done2\n#### 3. [ ] todo3\n## Final Verification Wave\n### F1. [ ] f\n`
    )
    const { tasksContent } = syncPlanToTasksFile(planPath, changeRoot, changeName)

    expect(tasksContent).toContain("- [x] 1.1 done1")
    expect(tasksContent).toContain("- [x] 1.2 done2")
    expect(tasksContent).toContain("- [ ] 1.3 todo3")
  })
})

describe("幂等性", () => {
  test("多次 sync 输出相同的 tasks.md", () => {
    const changeName = "idempotent"
    const changeRoot = join(tmp, "openspec", "changes", changeName)
    mkdirSync(changeRoot, { recursive: true })

    const planPath = writePlan(
      changeName,
      `## TL;DR\nT\n## TODOs\n#### 1. [ ] t1\n#### 2. [x] t2\n## Final Verification Wave\n### F1. [ ] f\n`
    )

    const first = syncPlanToTasksFile(planPath, changeRoot, changeName)
    const second = syncPlanToTasksFile(planPath, changeRoot, changeName)

    expect(first.tasksContent).toBe(second.tasksContent)
    expect(readFileSync(first.tasksFile, "utf-8")).toBe(
      readFileSync(second.tasksFile, "utf-8")
    )
  })

  test("plan 改后重 sync 反映新内容（plan 是 source of truth）", () => {
    const changeName = "plan-evolves"
    const changeRoot = join(tmp, "openspec", "changes", changeName)
    mkdirSync(changeRoot, { recursive: true })

    const planPath = writePlan(
      changeName,
      `## TL;DR\nv1\n## TODOs\n#### 1. [ ] original\n## Final Verification Wave\n### F1. [ ] f\n`
    )
    const { tasksFile } = syncPlanToTasksFile(planPath, changeRoot, changeName)
    const first = readFileSync(tasksFile, "utf-8")
    expect(first).toContain("original")

    // 用户改 plan（OMO 实施过程中常见）
    writeFileSync(
      planPath,
      `## TL;DR\nv2\n## TODOs\n#### 1. [ ] updated\n## Final Verification Wave\n### F1. [ ] f\n`
    )
    syncPlanToTasksFile(planPath, changeRoot, changeName)
    const second = readFileSync(tasksFile, "utf-8")

    expect(second).toContain("updated")
    expect(second).not.toContain("original")
  })
})

describe("错误路径", () => {
  test("plan 文件不存在 → 抛清晰错误", () => {
    const changeRoot = join(tmp, "openspec", "changes", "missing-plan")
    mkdirSync(changeRoot, { recursive: true })

    expect(() =>
      syncPlanToTasksFile(
        join(tmp, ".omo", "plans", "ghost.md"),
        changeRoot,
        "ghost"
      )
    ).toThrow(/plan 文件不存在/)
  })

  test("planFilePath 为空字符串 → 抛清晰错误", () => {
    const changeRoot = join(tmp, "openspec", "changes", "empty-path")
    mkdirSync(changeRoot, { recursive: true })

    expect(() => syncPlanToTasksFile("", changeRoot, "empty")).toThrow(
      /plan 文件不存在/
    )
  })

  test("changeRoot 为空 → 抛清晰错误", () => {
    const planPath = writePlan("x", `## TL;DR\nT\n`)

    expect(() => syncPlanToTasksFile(planPath, "", "x")).toThrow(
      /changeRoot 为空/
    )
  })

  test("changeRoot 目录不存在 → 自动创建", () => {
    const changeName = "auto-mkdir"
    const changeRoot = join(tmp, "openspec", "changes", changeName, "nested", "deep")
    // 不调用 mkdirSync，验证 syncPlanToTasksFile 自动建

    const planPath = writePlan(
      changeName,
      `## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n`
    )
    const { tasksFile } = syncPlanToTasksFile(planPath, changeRoot, changeName)

    expect(existsSync(tasksFile)).toBe(true)
  })
})
