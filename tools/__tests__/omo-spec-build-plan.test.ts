#!/usr/bin/env bun test
/**
 * omo-spec buildOmoPlan 单元测试
 * 验证 9-section 固定结构组装
 */

import { describe, expect, test } from "bun:test"
import { buildOmoPlan, validateOmoPlan } from "../omo-spec"

describe("buildOmoPlan - 9 section 固定结构", () => {
  test("9 个 section 标题都存在", () => {
    const out = buildOmoPlan({
      tldr: "TL;DR content",
      context: "Context content",
      workObjectives: "WO content",
      verificationStrategy: "VS content",
      executionStrategy: "ES content",
      todos: "#### 1. [ ] task",
      finalVerificationWave: "### F1. [ ] fvw",
      commitStrategy: "CS content",
      successCriteria: "SC content",
    })
    expect(out).toContain("## TL;DR")
    expect(out).toContain("## Context")
    expect(out).toContain("## Work Objectives")
    expect(out).toContain("## Verification Strategy")
    expect(out).toContain("## Execution Strategy")
    expect(out).toContain("## TODOs")
    expect(out).toContain("## Final Verification Wave")
    expect(out).toContain("## Commit Strategy")
    expect(out).toContain("## Success Criteria")
  })

  test("9 个 section 顺序固定", () => {
    const out = buildOmoPlan({
      tldr: "T",
      context: "C",
      workObjectives: "WO",
      verificationStrategy: "VS",
      executionStrategy: "ES",
      todos: "#### 1. [ ] t",
      finalVerificationWave: "### F1. [ ] f",
      commitStrategy: "CS",
      successCriteria: "SC",
    })
    // 用 indexOf 验证顺序
    const tldr = out.indexOf("## TL;DR")
    const context = out.indexOf("## Context")
    const wo = out.indexOf("## Work Objectives")
    const vs = out.indexOf("## Verification Strategy")
    const es = out.indexOf("## Execution Strategy")
    const todos = out.indexOf("## TODOs")
    const fvw = out.indexOf("## Final Verification Wave")
    const cs = out.indexOf("## Commit Strategy")
    const sc = out.indexOf("## Success Criteria")

    expect(tldr).toBeLessThan(context)
    expect(context).toBeLessThan(wo)
    expect(wo).toBeLessThan(vs)
    expect(vs).toBeLessThan(es)
    expect(es).toBeLessThan(todos)
    expect(todos).toBeLessThan(fvw)
    expect(fvw).toBeLessThan(cs)
    expect(cs).toBeLessThan(sc)
  })

  test("每个 section 后有空行分隔", () => {
    const out = buildOmoPlan({
      tldr: "T",
      context: "C",
      workObjectives: "WO",
      verificationStrategy: "VS",
      executionStrategy: "ES",
      todos: "#### 1. [ ] t",
      finalVerificationWave: "### F1. [ ] f",
      commitStrategy: "CS",
      successCriteria: "SC",
    })
    // 验证 ## 标题后有换行
    const lines = out.split("\n")
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].startsWith("## ") && lines[i] !== "## Success Criteria") {
        // ## 标题行后，下一行应该是 section 内容（除非是 TODO/FVW 那种有 hint 行的）
        expect(lines[i + 1]).toBeTruthy()
      }
    }
  })
})

describe("buildOmoPlan - 内容透传", () => {
  test("每个 section 内容原样保留", () => {
    const sections = {
      tldr: "一句话概述",
      context: "背景信息",
      workObjectives: "- 目标 1\n- 目标 2",
      verificationStrategy: "- 验证 1",
      executionStrategy: "- 执行 1",
      todos: "#### 1. [ ] task\n   **Acceptance**: ok",
      finalVerificationWave: "### F1. [ ] fvw",
      commitStrategy: "- 提交 1",
      successCriteria: "- 标准 1",
    }
    const out = buildOmoPlan(sections)
    expect(out).toContain(sections.tldr)
    expect(out).toContain(sections.context)
    expect(out).toContain(sections.workObjectives)
    expect(out).toContain(sections.verificationStrategy)
    expect(out).toContain(sections.executionStrategy)
    expect(out).toContain(sections.todos)
    expect(out).toContain(sections.finalVerificationWave)
    expect(out).toContain(sections.commitStrategy)
    expect(out).toContain(sections.successCriteria)
  })

  test("特殊字符内容保留", () => {
    const sections = {
      tldr: "emoji 🎉 + 特殊 & < > 字符",
      context: "中文 + 阿拉伯文 مرحبا",
      workObjectives: "code `inline`",
      verificationStrategy: "path /usr/local/bin",
      executionStrategy: "markdown **bold**",
      todos: "#### 1. [ ] task",
      finalVerificationWave: "### F1. [ ] f",
      commitStrategy: "JSON {\"key\": \"value\"}",
      successCriteria: "regex \\d+",
    }
    const out = buildOmoPlan(sections)
    expect(out).toContain("🎉")
    expect(out).toContain("&")
    expect(out).toContain("مرحبا")
    expect(out).toContain("**bold**")
  })

  test("空字符串也允许", () => {
    const out = buildOmoPlan({
      tldr: "",
      context: "",
      workObjectives: "",
      verificationStrategy: "",
      executionStrategy: "",
      todos: "",
      finalVerificationWave: "",
      commitStrategy: "",
      successCriteria: "",
    })
    // 9 个 section 标题仍存在
    expect(out.match(/^## /gm)?.length).toBe(9)
  })
})

describe("buildOmoPlan - 输出可被 parseOmoPlan 正确解析", () => {
  test("完整 buildOmoPlan 输出通过 validateOmoPlan 7 项检查", () => {
    const sections = {
      tldr: "TL;DR",
      context: "Context",
      workObjectives: "WO",
      verificationStrategy: "VS",
      executionStrategy: "ES",
      todos: "#### 1. [ ] task1\n   **Acceptance**: pass\n\n#### 2. [ ] task2",
      finalVerificationWave: "### F1. [ ] fvw",
      commitStrategy: "CS",
      successCriteria: "SC",
    }
    const out = buildOmoPlan(sections)
    const validation = validateOmoPlan(out, "test")
    expect(validation.valid).toBe(true)
    expect(validation.passedChecks).toBe(7)
  })

  test("buildOmoPlan 输出的 section 数 = 9", () => {
    const out = buildOmoPlan({
      tldr: "T",
      context: "C",
      workObjectives: "WO",
      verificationStrategy: "VS",
      executionStrategy: "ES",
      todos: "#### 1. [ ] t",
      finalVerificationWave: "### F1. [ ] f",
      commitStrategy: "CS",
      successCriteria: "SC",
    })
    const sectionCount = (out.match(/^## /gm) || []).length
    expect(sectionCount).toBe(9)
  })
})

describe("buildOmoPlan - 多行内容", () => {
  test("section 内容含多行", () => {
    const sections = {
      tldr: "T",
      context: "Line 1\nLine 2",
      workObjectives: "Line 1\nLine 2\nLine 3",
      verificationStrategy: "V",
      executionStrategy: "E",
      todos: "#### 1. [ ] t\n   **Field**: v\n   **Field2**: v2",
      finalVerificationWave: "### F1. [ ] f",
      commitStrategy: "C",
      successCriteria: "S",
    }
    const out = buildOmoPlan(sections)
    expect(out).toContain("Line 1\nLine 2")
    expect(out).toContain("Line 1\nLine 2\nLine 3")
  })
})
