#!/usr/bin/env bun test
/**
 * omo-spec 3 个 tool 的 execute() 集成测试
 * - sync_tasks_from_plan（含 batch / single / skip / 子目录边界）
 * - validate_omo_plan（结构化返回）
 * - prepare_verification_context（artifacts + 5 维度）
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseOmoPlan,
  prepareVerificationContext,
  sync_tasks_from_plan,
  VERIFICATION_DIMENSIONS,
  VERDICT_RULES,
} from "../omo-spec"

// ============================================================
// prepareVerificationContext
// ============================================================

describe("prepareVerificationContext", () => {
  test("5 维度清单完整", () => {
    const ctx = prepareVerificationContext(
      "test",
      { proposal: "p", design: "d", specs: "s", plan: "pl" },
      ["file1.ts", "file2.ts"]
    )
    expect(ctx.dimensions.length).toBe(5)
    expect(ctx.dimensions[0].name).toBe("Spec 合规性")
    expect(ctx.dimensions[1].name).toBe("Design 对齐")
    expect(ctx.dimensions[2].name).toBe("Proposal 范围")
    expect(ctx.dimensions[3].name).toBe("Task 完成度")
    expect(ctx.dimensions[4].name).toBe("非功能性合规性")
  })

  test("每个维度有 checks", () => {
    const ctx = prepareVerificationContext(
      "test",
      { proposal: null, design: null, specs: null, plan: null },
      []
    )
    for (const dim of ctx.dimensions) {
      expect(dim.checks.length).toBeGreaterThan(0)
    }
  })

  test("changedFiles 透传", () => {
    const ctx = prepareVerificationContext(
      "test",
      { proposal: null, design: null, specs: null, plan: null },
      ["a.ts", "b.ts", "c.md"]
    )
    expect(ctx.changedFiles).toEqual(["a.ts", "b.ts", "c.md"])
  })

  test("artifacts 透传（可包含 null）", () => {
    const ctx = prepareVerificationContext(
      "test",
      { proposal: "p", design: null, specs: "s", plan: null },
      []
    )
    expect(ctx.artifacts.proposal).toBe("p")
    expect(ctx.artifacts.design).toBe(null)
    expect(ctx.artifacts.specs).toBe("s")
    expect(ctx.artifacts.plan).toBe(null)
  })

  test("verdictRules 包含 blocked/conditional/note", () => {
    const ctx = prepareVerificationContext(
      "test",
      { proposal: null, design: null, specs: null, plan: null },
      []
    )
    expect(ctx.verdictRules.blocked).toBeTruthy()
    expect(ctx.verdictRules.conditional).toBeTruthy()
    expect(ctx.verdictRules.note).toBeTruthy()
  })

  test("changeName 透传", () => {
    const ctx = prepareVerificationContext(
      "my-change",
      { proposal: null, design: null, specs: null, plan: null },
      []
    )
    expect(ctx.changeName).toBe("my-change")
  })
})

describe("VERIFICATION_DIMENSIONS 常量", () => {
  test("导出供 AI 引用", () => {
    expect(VERIFICATION_DIMENSIONS.length).toBe(5)
  })

  test("VERDICT_RULES 导出", () => {
    expect(VERDICT_RULES.blocked).toContain("修复")
    expect(VERDICT_RULES.conditional).toContain("可接受")
    expect(VERDICT_RULES.note).toContain("BLOCKED")
  })
})

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

describe("prepareVerificationContext - changedFiles 由 Oracle 自行捕获", () => {
  test("changedFiles 透传（通常为空，由 Oracle 执行 git diff 填充）", () => {
    const ctx = prepareVerificationContext(
      "t",
      { proposal: null, design: null, specs: null, plan: null },
      ["a.ts", "b.ts"]
    )
    expect(ctx.changedFiles).toEqual(["a.ts", "b.ts"])
    // 修复后：gitDiffWarning 字段被删除（Oracle 自行执行 git diff，无需 tool 报告）
    expect((ctx as any).gitDiffWarning).toBeUndefined()
  })

  test("changedFiles 默认为空数组", () => {
    const ctx = prepareVerificationContext(
      "t",
      { proposal: null, design: null, specs: null, plan: null },
      []
    )
    expect(ctx.changedFiles).toEqual([])
  })
})

describe("sync_tasks_from_plan 批量模式", () => {
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
      expect(result.output).toContain("没有 .md plan 文件")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plans 目录不存在时抛清晰错误", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-batch-nodir-"))
    try {
      await expect(
        (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
      const first = readFileSync(join(tmp, "openspec", "changes", "idem", "tasks.md"), "utf-8")
      await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
      expect(result.output).toContain("1 个 plan 跳过")
      expect(existsSync(join(archiveDir, "tasks.md"))).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe("sync_tasks_from_plan single mode（传 change_name）", () => {
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
      const result = await (sync_tasks_from_plan as any).execute(
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
        (sync_tasks_from_plan as any).execute(
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
        (sync_tasks_from_plan as any).execute(
          { change_name: "ghost" },
          { directory: tmp }
        )
      ).rejects.toThrow(/plan 文件不存在/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("change_name 为空字符串 → 抛清晰错误", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-empty-"))
    try {
      await expect(
        (sync_tasks_from_plan as any).execute(
          { change_name: "" },
          { directory: tmp }
        )
      ).rejects.toThrow(/change_name/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("change_name 为 null → 抛清晰错误", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-single-null-"))
    try {
      await expect(
        (sync_tasks_from_plan as any).execute(
          { change_name: null },
          { directory: tmp }
        )
      ).rejects.toThrow(/change_name/)
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
      const singleResult = await (sync_tasks_from_plan as any).execute(
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
      const result = await (sync_tasks_from_plan as any).execute(
        { change_name: "only" },
        { directory: tmp }
      )
      expect(result.title).toBe("sync_tasks_from_plan: only")
      expect(result.metadata.mode).toBe("single")
      expect(result.metadata.changeName).toBe("only")
      expect(result.metadata.total).toBe(2)
      expect(result.metadata.completed).toBe(0)
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
      const result = await (sync_tasks_from_plan as any).execute(
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
      const result = await (sync_tasks_from_plan as any).execute({}, { directory: tmp })
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
