#!/usr/bin/env bun test
/**
 * omo-spec 3 个新纯函数单元测试
 * - checkTasksPhaseStatus
 * - buildChangeContext
 * - prepareVerificationContext
 */

import { describe, expect, test } from "bun:test"
import {
  prepareVerificationContext,
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
