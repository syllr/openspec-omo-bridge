#!/usr/bin/env bun test
/**
 * parseOmoPlan 扩展: Success Criteria `- [ ]` 解析测试
 */

import { describe, expect, test } from "bun:test"
import { parseOmoPlan } from "../sync-plan-to-tasks"

const PLAN_WITH_SC = `## 1. TL;DR
T
## 6. TODOs
#### 1. [ ] task one
- **What**: a
#### 2. [ ] task two
- **What**: b
## 9. Success Criteria
- [ ] criterion alpha
- [ ] criterion beta
- [x] criterion gamma
`

describe("parseOmoPlan - Success Criteria 解析", () => {
  test("SC section 下的 - [ ] / - [x] 都解析为 criterion", () => {
    const plan = parseOmoPlan(PLAN_WITH_SC, "t")
    expect(plan.successCriteria.length).toBe(3)
    expect(plan.successCriteria[0]).toEqual({
      index: 1,
      text: "criterion alpha",
      completed: false,
    })
    expect(plan.successCriteria[1]).toEqual({
      index: 2,
      text: "criterion beta",
      completed: false,
    })
    expect(plan.successCriteria[2]).toEqual({
      index: 3,
      text: "criterion gamma",
      completed: true,
    })
  })

  test("空 plan 返回空 successCriteria 数组", () => {
    const plan = parseOmoPlan("", "t")
    expect(plan.successCriteria).toEqual([])
  })

  test("无 SC section → 空数组", () => {
    const plan = parseOmoPlan(
      "## TL;DR\nT\n## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] f\n",
      "t"
    )
    expect(plan.successCriteria).toEqual([])
  })

  test("SC section 无 checkbox 行 → 空数组 + body 保留", () => {
    const plan = parseOmoPlan(
      "## Success Criteria\n- plain item\n- another\n",
      "t"
    )
    expect(plan.successCriteria).toEqual([])
    expect(plan.sections[0].body).toContain("- plain item")
  })

  test("多个 SC section → 索引连续累加", () => {
    const plan = parseOmoPlan(
      "## Success Criteria\n- [ ] a\n- [x] b\n## Work Objectives\nx\n## Success Criteria\n- [ ] c\n",
      "t"
    )
    expect(plan.successCriteria.length).toBe(3)
    expect(plan.successCriteria.map((c) => c.text)).toEqual(["a", "b", "c"])
    expect(plan.successCriteria[0].completed).toBe(false)
    expect(plan.successCriteria[1].completed).toBe(true)
    expect(plan.successCriteria[2].completed).toBe(false)
  })

  test("SC section header 接受数字前缀 ## 9. Success Criteria", () => {
    const plan = parseOmoPlan(PLAN_WITH_SC, "t")
    expect(plan.successCriteria.length).toBe(3)
  })

  test("SC checkbox 接受大写 X", () => {
    const plan = parseOmoPlan(
      "## Success Criteria\n- [X] done upper\n",
      "t"
    )
    expect(plan.successCriteria[0].completed).toBe(true)
  })
})
