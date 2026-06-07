#!/usr/bin/env bun test
/**
 * omo-spec 2 个 tool 的 execute() 集成测试
 * - plan_to_tasks（含 batch / single / skip / 子目录边界）
 * - check_plan（结构化返回）
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseOmoPlan,
  plan_to_tasks,
  check_plan,
} from "../omo-spec"

// ============================================================
// P3 修复：parseOmoPlan / generateOpenSpecTasks 边界
// (Oracle review ⚪ #6, #9, #32)
// ============================================================

describe("parseOmoPlan - 防御性输入检查 (A6)", () => {
  test("空字符串返回空 plan", () => {
    const plan = parseOmoPlan("", "t")
    expect(plan.sections).toEqual([])
    expect(plan.tasks).toEqual([])
  })

  test("null 返回空 plan", () => {
    // @ts-expect-error - 故意传入 null 测试防御
    const plan = parseOmoPlan(null, "t")
    expect(plan.sections).toEqual([])
    expect(plan.tasks).toEqual([])
  })

  test("undefined 返回空 plan", () => {
    // @ts-expect-error - 故意传入 undefined 测试防御
    const plan = parseOmoPlan(undefined, "t")
    expect(plan.sections).toEqual([])
    expect(plan.tasks).toEqual([])
  })
})

describe("parseOmoPlan - 换行符处理 (A32)", () => {
  test("经典 Mac 单独 \\r", () => {
    const plan = parseOmoPlan(
      "## TODOs\r#### 1. [ ] t\r",
      "t"
    )
    expect(plan.sections[0].title).toBe("TODOs")
    expect(plan.tasks[0].title).toBe("t")
  })

  test("Windows \\r\\n", () => {
    const plan = parseOmoPlan(
      "## TODOs\r\n#### 1. [ ] t\r\n",
      "t"
    )
    expect(plan.sections[0].title).toBe("TODOs")
    expect(plan.tasks[0].title).toBe("t")
  })

  test("Unix \\n（回归测试）", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.tasks[0].title).toBe("t")
  })
})

describe("generateOpenSpecTasks - 空 wave 标签处理 (A9)", () => {
  test("无 Wave 时输出 ### Unassigned", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n#### 2. [ ] t2\n`,
      "t"
    )
    const out = (require("../omo-spec") as typeof import("../omo-spec"))
      .generateOpenSpecTasks(plan)
    // 修复前输出 "### "（空标题），现在输出 "### Unassigned"
    expect(out).toContain("### Unassigned")
    expect(out).not.toMatch(/^### $/m)
  })

  test("有 Wave 时仍正常输出 Wave 标题", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: first\n#### 1. [ ] t1\n`,
      "t"
    )
    const out = (require("../omo-spec") as typeof import("../omo-spec"))
      .generateOpenSpecTasks(plan)
    expect(out).toContain("### Wave 1: first")
  })
})

describe("plan_to_tasks 批量模式", () => {
  function setupPlan(tmp: string, name: string, content: string) {
    const plansDir = join(tmp, ".omo", "plans")
    mkdirSync(plansDir, { recursive: true })
    writeFileSync(join(plansDir, `${name}.md`), content)
  }

  function setupChange(tmp: string, name: string) {
    const changeDir = join(tmp, "openspec", "changes", name)
    mkdirSync(changeDir, { recursive: true })
  }

  test("无 plan 时返回空提示", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-empty-"))
    try {
      mkdirSync(join(tmp, ".omo", "plans"), { recursive: true })
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("没有 .md plan 文件")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plans 目录不存在时抛清晰错误", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-nodir-"))
    try {
      await expect(
        (plan_to_tasks as any).execute({}, { directory: tmp })
      ).rejects.toThrow(/plans 目录不存在/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plan 匹配 change → 同步成功", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-match-"))
    try {
      setupPlan(tmp, "feature-x", "## TL;DR\nT\n## TODOs\n#### 1. [ ] task1\n## Final Verification Wave\n### F1. [ ] f\n")
      setupChange(tmp, "feature-x")
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("1 个 change 已同步")
      expect(result.output).toContain("feature-x")
      expect(existsSync(join(tmp, "openspec", "changes", "feature-x", "tasks.md"))).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plan 无匹配 change → 跳过", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-skip-"))
    try {
      setupPlan(tmp, "orphan-plan", "## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n")
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("1 个 plan 跳过")
      expect(result.output).toContain("无匹配的 change 目录")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plan 含 0 task → 跳过", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-emptytask-"))
    try {
      setupPlan(tmp, "empty-tasks", "## TL;DR\nT\n## Context\nC\n")
      setupChange(tmp, "empty-tasks")
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("plan 中无任务（0 tasks）")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("多个 plan：部分匹配部分跳过", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-multi-"))
    try {
      setupPlan(tmp, "matched", "## TL;DR\nT\n## TODOs\n#### 1. [ ] t1\n## Final Verification Wave\n### F1. [ ] f\n")
      setupPlan(tmp, "orphan", "## TL;DR\nT\n## TODOs\n#### 1. [ ] t2\n## Final Verification Wave\n### F1. [ ] f\n")
      setupChange(tmp, "matched")
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("1 个 change 已同步")
      expect(result.output).toContain("1 个 plan 跳过")
      expect(existsSync(join(tmp, "openspec", "changes", "matched", "tasks.md"))).toBe(true)
      expect(existsSync(join(tmp, "openspec", "changes", "orphan", "tasks.md"))).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("幂等性：多次 sync 输出相同", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-idem-"))
    try {
      setupPlan(tmp, "idem", "## TL;DR\nT\n## TODOs\n#### 1. [ ] t1\n#### 2. [x] t2\n## Final Verification Wave\n### F1. [ ] f\n")
      setupChange(tmp, "idem")
      await (plan_to_tasks as any).execute({}, { directory: tmp })
      const first = readFileSync(join(tmp, "openspec", "changes", "idem", "tasks.md"), "utf-8")
      await (plan_to_tasks as any).execute({}, { directory: tmp })
      const second = readFileSync(join(tmp, "openspec", "changes", "idem", "tasks.md"), "utf-8")
      expect(first).toBe(second)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("archive/ 子目录被跳过（不是 active change）", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-archive-"))
    try {
      setupPlan(tmp, "archived-old", "## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n")
      const archiveDir = join(tmp, "openspec", "changes", "archive", "archived-old")
      mkdirSync(archiveDir, { recursive: true })
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("1 个 plan 跳过")
      expect(existsSync(join(archiveDir, "tasks.md"))).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe("plan_to_tasks single mode（传 change_name）", () => {
  function setupPlan(tmp: string, name: string, content: string) {
    const plansDir = join(tmp, ".omo", "plans")
    mkdirSync(plansDir, { recursive: true })
    writeFileSync(join(plansDir, `${name}.md`), content)
  }
  function setupChange(tmp: string, name: string) {
    mkdirSync(join(tmp, "openspec", "changes", name), { recursive: true })
  }
  const PLAN_CONTENT = "## TL;DR\nT\n## TODOs\n#### 1. [ ] t1\n## Final Verification Wave\n### F1. [ ] f\n"

  test("change_name 匹配 → 同步该单个", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-ok-"))
    try {
      setupPlan(tmp, "target", PLAN_CONTENT)
      setupPlan(tmp, "other", PLAN_CONTENT)
      setupChange(tmp, "target")
      const result = await (plan_to_tasks as any).execute(
        { change_name: "target" },
        { directory: tmp }
      )
      expect(result.output).toContain("target: 同步完成")
      expect(result.output).toContain("2 tasks")
      expect(existsSync(join(tmp, "openspec", "changes", "target", "tasks.md"))).toBe(true)
      expect(existsSync(join(tmp, "openspec", "changes", "other", "tasks.md"))).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("change_name 无匹配 change → 抛清晰错误", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-skip-"))
    try {
      setupPlan(tmp, "orphan", PLAN_CONTENT)
      await expect(
        (plan_to_tasks as any).execute(
          { change_name: "orphan" },
          { directory: tmp }
        )
      ).rejects.toThrow(/change 目录不存在/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("change_name plan 不存在 → 抛清晰错误", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-noplan-"))
    try {
      mkdirSync(join(tmp, ".omo", "plans"), { recursive: true })
      await expect(
        (plan_to_tasks as any).execute(
          { change_name: "ghost" },
          { directory: tmp }
        )
      ).rejects.toThrow(/plan 文件不存在/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("change_name 为空字符串 → 走 batch 模式（视为未传）", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-empty-"))
    try {
      mkdirSync(join(tmp, ".omo", "plans"), { recursive: true })
      const result = await (plan_to_tasks as any).execute(
        { change_name: "" },
        { directory: tmp }
      )
      expect(result.metadata.mode).toBe("batch")
      expect(result.output).toMatch(/批量|没有 \.md plan 文件/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("change_name 为 null → 走 batch 模式（视为未传）", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-null-"))
    try {
      mkdirSync(join(tmp, ".omo", "plans"), { recursive: true })
      const result = await (plan_to_tasks as any).execute(
        { change_name: null },
        { directory: tmp }
      )
      expect(result.metadata.mode).toBe("batch")
      expect(result.output).toContain("没有 .md plan 文件")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("hybrid：传 change_name 只动该 change，不传批量", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-hybrid-"))
    try {
      setupPlan(tmp, "alpha", PLAN_CONTENT)
      setupPlan(tmp, "beta", PLAN_CONTENT)
      setupChange(tmp, "alpha")
      setupChange(tmp, "beta")
      const singleResult = await (plan_to_tasks as any).execute(
        { change_name: "alpha" },
        { directory: tmp }
      )
      expect(singleResult.output).toContain("alpha: 同步完成")
      expect(singleResult.output).not.toContain("beta")
      expect(existsSync(join(tmp, "openspec", "changes", "beta", "tasks.md"))).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("批量：.omo/plans/ 下的子目录不会被当成 plan 读", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-subdir-"))
    try {
      const plansDir = join(tmp, ".omo", "plans")
      mkdirSync(plansDir, { recursive: true })
      setupPlan(tmp, "real-plan", PLAN_CONTENT)
      setupChange(tmp, "real-plan")
      mkdirSync(join(plansDir, "not-a-plan"), { recursive: true })
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.output).toContain("1 个 change 已同步")
      expect(result.output).not.toContain("not-a-plan")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("结构化返回：batch 模式 metadata 含 synced/skipped 数组", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-meta-"))
    try {
      setupPlan(tmp, "a", PLAN_CONTENT)
      setupPlan(tmp, "orphan", PLAN_CONTENT)
      setupChange(tmp, "a")
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.title).toContain("batch")
      expect(result.title).toContain("1 synced")
      expect(result.metadata.mode).toBe("batch")
      expect(Array.isArray(result.metadata.synced)).toBe(true)
      expect(result.metadata.synced[0].change).toBe("a")
      expect(result.metadata.synced[0].total).toBe(2)
      expect(result.metadata.synced[0].completed).toBe(0)
      expect(result.metadata.synced[0].waves).toBe(2)
      expect(Array.isArray(result.metadata.skipped)).toBe(true)
      expect(result.metadata.skipped[0].plan).toBe("orphan.md")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("结构化返回：single 模式 success metadata 含 total/completed/waves", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-meta-"))
    try {
      setupPlan(tmp, "only", PLAN_CONTENT)
      setupChange(tmp, "only")
      const result = await (plan_to_tasks as any).execute(
        { change_name: "only" },
        { directory: tmp }
      )
      expect(result.title).toBe("plan_to_tasks: only")
      expect(result.metadata.mode).toBe("single")
      expect(result.metadata.changeName).toBe("only")
      expect(result.metadata.total).toBe(2)
      expect(result.metadata.completed).toBe(0)
      expect(result.metadata.manualVerification).toBe(1)
      expect(result.metadata.waves).toBe(2)
      expect(result.metadata.tasksPath).toContain("openspec/changes/only/tasks.md")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("结构化返回：single 模式 0-task plan → skip return path", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-0task-"))
    try {
      setupPlan(tmp, "empty-change", "## TL;DR\nT\n## Context\nC\n")
      setupChange(tmp, "empty-change")
      const result = await (plan_to_tasks as any).execute(
        { change_name: "empty-change" },
        { directory: tmp }
      )
      expect(result.title).toContain("skip")
      expect(result.metadata.mode).toBe("single")
      expect(result.metadata.changeName).toBe("empty-change")
      expect(result.metadata.synced).toBe(0)
      expect(result.metadata.reason).toContain("0 tasks")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("结构化返回：batch 模式 skip 时 metadata.skipped 含 reason", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-skip-"))
    try {
      setupPlan(tmp, "only-valid", PLAN_CONTENT)
      setupPlan(tmp, "ghost", PLAN_CONTENT)
      setupChange(tmp, "only-valid")
      const result = await (plan_to_tasks as any).execute({}, { directory: tmp })
      expect(result.title).toContain("1 synced")
      expect(result.title).toContain("1 skipped")
      const skipEntry = result.metadata.skipped.find((s: { plan: string }) => s.plan === "ghost.md")
      expect(skipEntry).toBeDefined()
      expect(skipEntry.reason).toContain("无匹配的 change 目录")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ============================================================
// check_plan tool execute() 集成测试
// (Oracle review ⚪ #4: 补 check_plan 的 tool 外壳测试)
// ============================================================

describe("check_plan - tool execute() 集成", () => {
  const VALID_PLAN = [
    "## TL;DR",
    "T",
    "## Context",
    "C",
    "## Work Objectives",
    "W",
    "## Verification Strategy",
    "V",
    "## Execution Strategy",
    "E",
    "## TODOs",
    "#### 1. [ ] task one",
    "## Final Verification Wave",
    "### F1. [ ] fvw one",
    "## Commit Strategy",
    "S",
    "## Success Criteria",
    "- [ ] criterion one",
  ].join("\n")

  function setupPlan(tmp: string, name: string, content: string) {
    const plansDir = join(tmp, ".omo", "plans")
    mkdirSync(plansDir, { recursive: true })
    writeFileSync(join(plansDir, `${name}.md`), content)
  }

  test("happy path: 传 change_name 验证合法 plan → 11/11 通过", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-check-happy-"))
    try {
      setupPlan(tmp, "feat", VALID_PLAN)
      const result = await (check_plan as any).execute(
        { change_name: "feat" },
        { directory: tmp }
      )
      expect(result.title).toBe("check_plan: feat (11/11)")
      expect(result.output).toContain("✅ plan 结构检查通过")
      expect(result.output).toContain("11/11")
      expect(result.metadata.valid).toBe(true)
      expect(result.metadata.passedChecks).toBe(11)
      expect(result.metadata.totalChecks).toBe(11)
      expect(result.metadata.changeName).toBe("feat")
      expect(Array.isArray(result.metadata.results)).toBe(true)
      expect(result.metadata.results).toHaveLength(11)
      expect(result.metadata.results.every((r: { passed: boolean }) => r.passed)).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("happy path: 传 plan_file_path 也能成功", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-check-pf-"))
    try {
      setupPlan(tmp, "feat2", VALID_PLAN)
      const planPath = join(tmp, ".omo", "plans", "feat2.md")
      const result = await (check_plan as any).execute(
        { plan_file_path: planPath },
        { directory: tmp }
      )
      expect(result.metadata.valid).toBe(true)
      expect(result.metadata.changeName).toBe("feat2")
      expect(result.title).toBe("check_plan: feat2 (11/11)")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("失败: plan 缺少必填 section → throw 含失败清单 + 修复建议", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-check-fail-"))
    try {
      setupPlan(tmp, "bad", "## TL;DR\nT\n")
      await expect(
        (check_plan as any).execute({ change_name: "bad" }, { directory: tmp })
      ).rejects.toThrow(/plan 结构检查失败/)
      await expect(
        (check_plan as any).execute({ change_name: "bad" }, { directory: tmp })
      ).rejects.toThrow(/请修复 plan 后重新运行此检查/)
      await expect(
        (check_plan as any).execute({ change_name: "bad" }, { directory: tmp })
      ).rejects.toThrow(/Context/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("失败: plan 文件不存在 → throw 含清晰路径 + 修复建议", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-check-nofile-"))
    try {
      await expect(
        (check_plan as any).execute(
          { change_name: "missing" },
          { directory: tmp }
        )
      ).rejects.toThrow(/plan 文件不存在/)
      await expect(
        (check_plan as any).execute(
          { change_name: "missing" },
          { directory: tmp }
        )
      ).rejects.toThrow(/确认 \.omo\/plans\/missing\.md 已创建/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("失败: 无参数 → throw 提示至少传一个", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-check-noargs-"))
    try {
      await expect(
        (check_plan as any).execute({}, { directory: tmp })
      ).rejects.toThrow(/至少传一个参数/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("失败: change_name 与 plan_file_path 推导出不一致 → throw", async () => {
      const tmp = mkdtempSync(join(tmpdir(), "omo-check-mismatch-"))
      try {
        setupPlan(tmp, "alpha", VALID_PLAN)
      const planPath = join(tmp, ".omo", "plans", "alpha.md")
      await expect(
        (check_plan as any).execute(
          { change_name: "beta", plan_file_path: planPath },
          { directory: tmp }
        )
      ).rejects.toThrow(/不一致/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
