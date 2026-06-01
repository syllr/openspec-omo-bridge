#!/usr/bin/env bun test
/**
 * omo-spec 3 个新纯函数单元测试
 * - checkTasksPhaseStatus
 * - buildChangeContext
 * - prepareVerificationContext
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, existsSync, rmSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseOmoPlan,
  prepareVerificationContext,
  sync_tasks_from_plan,
  VERIFICATION_DIMENSIONS,
  VERDICT_RULES,
  write_new_plan,
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
// write_new_plan / sync_tasks_from_plan - mkdirSync 保护
// (Oracle review 🟡 #2)
// ============================================================

describe("write_new_plan - 自动创建 .omo/plans/ 目录", () => {
  test(".omo/plans/ 不存在时自动创建", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-write-test-"))
    try {
      // 不预创建 .omo/plans/ 目录
      const result = await (write_new_plan as any).execute(
        {
          change_name: "test",
          tldr: "T",
          context: "C",
          work_objectives: "WO",
          verification_strategy: "V",
          execution_strategy: "E",
          todos: "#### 1. [ ] t",
          final_verification_wave: "### F1. [ ] f",
          commit_strategy: "CS",
          success_criteria: "SC",
        },
        { directory: tmp }
      )

      expect(result).toContain("✅ plan 已写入")
      expect(existsSync(join(tmp, ".omo", "plans", "test.md"))).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test(".omo/plans/ 已存在时正常写入", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-write-test-"))
    try {
      const plansDir = join(tmp, ".omo", "plans")
      // 预创建目录
      const { mkdirSync } = await import("node:fs")
      mkdirSync(plansDir, { recursive: true })

      await (write_new_plan as any).execute(
        {
          change_name: "test",
          tldr: "T",
          context: "C",
          work_objectives: "WO",
          verification_strategy: "V",
          execution_strategy: "E",
          todos: "#### 1. [ ] t",
          final_verification_wave: "### F1. [ ] f",
          commit_strategy: "CS",
          success_criteria: "SC",
        },
        { directory: tmp }
      )

      expect(existsSync(join(plansDir, "test.md"))).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("写入内容正确（9 个 section 都在）", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-write-test-"))
    try {
      await (write_new_plan as any).execute(
        {
          change_name: "test",
          tldr: "TL;DR content",
          context: "Context content",
          work_objectives: "WO content",
          verification_strategy: "VS content",
          execution_strategy: "ES content",
          todos: "#### 1. [ ] task1",
          final_verification_wave: "### F1. [ ] fvw1",
          commit_strategy: "CS content",
          success_criteria: "SC content",
        },
        { directory: tmp }
      )

      const content = readFileSync(
        join(tmp, ".omo", "plans", "test.md"),
        "utf-8"
      )
      expect(content).toContain("## TL;DR")
      expect(content).toContain("## TODOs")
      expect(content).toContain("## Final Verification Wave")
      expect(content).toContain("TL;DR content")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe("sync_tasks_from_plan - 自动创建 openspec/changes/<name>/ 目录", () => {
  test("openspec/changes/<name>/ 不存在时自动创建", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-sync-test-"))
    try {
      // 预创建 plan 文件
      const { mkdirSync, writeFileSync } = await import("node:fs")
      const plansDir = join(tmp, ".omo", "plans")
      mkdirSync(plansDir, { recursive: true })
      writeFileSync(
        join(plansDir, "test.md"),
        `## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n\n## Final Verification Wave\n### F1. [ ] f\n`
      )

      // 不预创建 openspec/changes/test/ 目录
      const result = await (sync_tasks_from_plan as any).execute(
        { change_name: "test" },
        { directory: tmp }
      )

      expect(result).toContain("✅ 同步完成")
      expect(
        existsSync(join(tmp, "openspec", "changes", "test", "tasks.md"))
      ).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plan 不存在时快速失败", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-sync-test-"))
    try {
      // 不创建任何文件
      await expect(
        (sync_tasks_from_plan as any).execute(
          { change_name: "missing" },
          { directory: tmp }
        )
      ).rejects.toThrow(/plan 文件不存在/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("已存在的 tasks.md 被覆盖（幂等性）", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-sync-test-"))
    try {
      const { mkdirSync, writeFileSync } = await import("node:fs")
      // 创建 plan
      const plansDir = join(tmp, ".omo", "plans")
      mkdirSync(plansDir, { recursive: true })
      writeFileSync(
        join(plansDir, "test.md"),
        `## TL;DR\nT\n## TODOs\n#### 1. [ ] task1\n\n## Final Verification Wave\n### F1. [ ] f1\n`
      )
      // 预创建 tasks.md（包含旧内容）
      const changesDir = join(tmp, "openspec", "changes", "test")
      mkdirSync(changesDir, { recursive: true })
      writeFileSync(join(changesDir, "tasks.md"), "OLD CONTENT")

      await (sync_tasks_from_plan as any).execute(
        { change_name: "test" },
        { directory: tmp }
      )

      const content = readFileSync(join(changesDir, "tasks.md"), "utf-8")
      expect(content).not.toContain("OLD CONTENT")
      expect(content).toContain("## Tasks")
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ============================================================
// Wave 标题支持中英文冒号
// (Oracle review 🟡 #3)
// ============================================================

describe("Wave 标题支持中英文冒号", () => {
  test("英文冒号 : 仍可解析（回归测试）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: first step\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: first step")
  })

  test("中文全角冒号 ： 可解析", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1：第一步\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: 第一步")
  })

  test("多个 Wave 混合中英文冒号", () => {
    const plan = parseOmoPlan(
      `## TODOs
### 6.1 Wave 1: english colon
#### 1. [ ] t1
### 6.2 Wave 2：中文冒号
#### 2. [ ] t2
`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: english colon")
    expect(plan.tasks[1].wave).toBe("Wave 2: 中文冒号")
  })

  test("Wave 后无内容时（边界情况）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: \n#### 1. [ ] t\n`,
      "t"
    )
    // 冒号后是空，trim 后应仍能解析
    expect(plan.tasks[0].wave).toBe("Wave 1:")
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
