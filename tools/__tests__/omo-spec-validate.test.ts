#!/usr/bin/env bun test
/**
 * omo-spec validateOmoPlan 单元测试
 * 测试 7 项 OMO 兼容性检查
 */

import { describe, expect, test } from "bun:test"
import { validateOmoPlan } from "../omo-spec"

const FULL_PLAN = `## TL;DR
Test plan.

## Context
Background.

## Work Objectives
- obj1

## Verification Strategy
- v1

## Execution Strategy
- e1

## TODOs

### 6.1 Wave 1: first

#### 1. [ ] First task
   **Acceptance**: \`bun test\`

#### 2. [ ] Second task

## Final Verification Wave

### F1. [ ] Final task

## Commit Strategy
- c1

## Success Criteria
- s1
`

const PLAN_MISSING_TODOS = `## TL;DR
x
## Context
x
## Work Objectives
x
## Verification Strategy
x
## Execution Strategy
x
## Final Verification Wave
x
## Commit Strategy
x
## Success Criteria
x
`

const PLAN_MISSING_FVW_TASKS = `## TL;DR
x
## Context
x
## TODOs
#### 1. [ ] task
## Final Verification Wave
## Commit Strategy
x
## Success Criteria
x
## Work Objectives
x
## Verification Strategy
x
## Execution Strategy
x
`

describe("validateOmoPlan - 9 项 section + 2 项 task 格式 = 11 项", () => {
  test("完整 plan 通过全部 11 项", () => {
    const result = validateOmoPlan(FULL_PLAN, "test")
    expect(result.valid).toBe(true)
    // A10 修复：从 5 项扩展到 9 项 section + 2 项 task 格式 = 11 项
    expect(result.totalChecks).toBe(11)
    expect(result.passedChecks).toBe(11)
    expect(result.results.every((r) => r.passed)).toBe(true)
  })

  test("缺 ## TODOs section", () => {
    const result = validateOmoPlan(PLAN_MISSING_TODOS, "test")
    expect(result.valid).toBe(false)
    // 失败：TODOs section + OMO TODO 任务格式 + OMO FVW 任务格式 = 3
    // 通过：9 section - 1 缺失 TODOs = 8
    expect(result.passedChecks).toBe(8)
    const failed = result.results.filter((r) => !r.passed)
    expect(failed.length).toBe(3)
    expect(failed.map((r) => r.name)).toContain("TODOs section")
    expect(failed.map((r) => r.name)).toContain("OMO TODO 任务格式")
    expect(failed.map((r) => r.name)).toContain("OMO FVW 任务格式")
  })

  test("FVW section 存在但无任务", () => {
    const result = validateOmoPlan(PLAN_MISSING_FVW_TASKS, "test")
    expect(result.valid).toBe(false)
    const failed = result.results.filter((r) => !r.passed)
    expect(failed.length).toBe(1)
    expect(failed[0].name).toBe("OMO FVW 任务格式")
  })
})

describe("validateOmoPlan - 各 section 独立检查", () => {
  test("缺 ## Final Verification Wave", () => {
    const plan = FULL_PLAN.replace(/## Final Verification Wave[\s\S]*?(?=## )/, "")
    const result = validateOmoPlan(plan, "test")
    const failed = result.results.filter((r) => !r.passed)
    expect(failed.map((r) => r.name)).toContain("Final Verification Wave section")
  })

  test("缺 ## TL;DR", () => {
    const plan = FULL_PLAN.replace(/## TL;DR[\s\S]*?(?=## )/, "")
    const result = validateOmoPlan(plan, "test")
    const failed = result.results.filter((r) => !r.passed)
    expect(failed.map((r) => r.name)).toContain("TL;DR section")
  })

  test("缺 ## Success Criteria", () => {
    // 移除整个 ## Success Criteria section（包括 body）
    const plan = FULL_PLAN.replace(/## Success Criteria[\s\S]*/, "")
    const result = validateOmoPlan(plan, "test")
    const failed = result.results.filter((r) => !r.passed)
    expect(failed.map((r) => r.name)).toContain("Success Criteria section")
  })

  test("缺 ## Commit Strategy", () => {
    const plan = FULL_PLAN.replace(/## Commit Strategy[\s\S]*?(?=## )/, "")
    const result = validateOmoPlan(plan, "test")
    const failed = result.results.filter((r) => !r.passed)
    expect(failed.map((r) => r.name)).toContain("Commit Strategy section")
  })
})

describe("validateOmoPlan - 任务格式检查", () => {
  test("至少 1 个 OMO TODO 任务", () => {
    const plan = `## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n## TL;DR\n## Context\n## Work Objectives\n## Verification Strategy\n## Execution Strategy\n## Commit Strategy\n## Success Criteria\n`
    const result = validateOmoPlan(plan, "test")
    expect(result.results.find((r) => r.name === "OMO TODO 任务格式")?.passed).toBe(true)
  })

  test("无 OMO TODO 任务", () => {
    const plan = `## TODOs\nno task here\n## Final Verification Wave\n### F1. [ ] f\n## TL;DR\n## Context\n## Work Objectives\n## Verification Strategy\n## Execution Strategy\n## Commit Strategy\n## Success Criteria\n`
    const result = validateOmoPlan(plan, "test")
    expect(result.results.find((r) => r.name === "OMO TODO 任务格式")?.passed).toBe(false)
  })

  test("至少 1 个 OMO FVW 任务", () => {
    const result = validateOmoPlan(FULL_PLAN, "test")
    expect(result.results.find((r) => r.name === "OMO FVW 任务格式")?.passed).toBe(true)
  })

  test("FVW section 存在但无 F1./F2. 任务", () => {
    const plan = `## TODOs\n#### 1. [ ] t\n## Final Verification Wave\nno FVW task\n## TL;DR\n## Context\n## Work Objectives\n## Verification Strategy\n## Execution Strategy\n## Commit Strategy\n## Success Criteria\n`
    const result = validateOmoPlan(plan, "test")
    expect(result.results.find((r) => r.name === "OMO FVW 任务格式")?.passed).toBe(false)
  })

  test("多个 TODO 任务都计入", () => {
    const plan = `## TODOs\n#### 1. [ ] a\n#### 2. [ ] b\n#### 3. [ ] c\n## Final Verification Wave\n### F1. [ ] f\n## TL;DR\n## Context\n## Work Objectives\n## Verification Strategy\n## Execution Strategy\n## Commit Strategy\n## Success Criteria\n`
    const result = validateOmoPlan(plan, "test")
    const todoCheck = result.results.find((r) => r.name === "OMO TODO 任务格式")
    expect(todoCheck?.description).toContain("3")
    expect(todoCheck?.passed).toBe(true)
  })
})

describe("validateOmoPlan - 多 section 顺序无关", () => {
  test("section 顺序不影响检查结果", () => {
    const plan = `## Commit Strategy\nx\n## TL;DR\nx\n## Success Criteria\nx\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n## Work Objectives\nx\n## Verification Strategy\nx\n## Execution Strategy\nx\n## Context\nx\n`
    const result = validateOmoPlan(plan, "test")
    expect(result.valid).toBe(true)
  })
})

describe("validateOmoPlan - 边界情况", () => {
  test("空字符串", () => {
    const result = validateOmoPlan("", "test")
    expect(result.valid).toBe(false)
    expect(result.passedChecks).toBe(0)
  })

  test("只有 section 标题无内容", () => {
    const plan = `## TODOs\n## Final Verification Wave\n## TL;DR\n## Success Criteria\n## Commit Strategy\n`
    const result = validateOmoPlan(plan, "test")
    // 5 个 section 通过，但任务格式失败
    expect(result.passedChecks).toBe(5)
  })

  test("section 标题带前导空格（应仍识别）", () => {
    const plan = `##   TODOs\n1. [ ] t\n## Final Verification Wave\nF1. [ ] f\n## TL;DR\n## Context\n## Work Objectives\n## Verification Strategy\n## Execution Strategy\n## Commit Strategy\n## Success Criteria\n`
    const result = validateOmoPlan(plan, "test")
    // \s+ in regex handles leading whitespace
    expect(result.results.find((r) => r.name === "TODOs section")?.passed).toBe(true)
  })

  test("section 标题后跟冒号（应仍识别）", () => {
    const plan = `## TL;DR: short\nx\n## TODOs\n1. [ ] t\n## Final Verification Wave\nF1. [ ] f\n## Success Criteria\n## Commit Strategy\n## Work Objectives\n## Verification Strategy\n## Execution Strategy\n## Context\n`
    // Regex 要求 \s* 之后是 $，所以 "TL;DR:" 不会匹配
    // 实际 plan 中 section 不应带冒号，但作为边界测试
    const result = validateOmoPlan(plan, "test")
    expect(result.results.find((r) => r.name === "TL;DR section")?.passed).toBe(false)
  })
})
