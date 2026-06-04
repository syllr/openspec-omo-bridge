#!/usr/bin/env bun test
/**
 * omo-spec 新增 tool + 纯函数测试
 * - validatePlanCompletion 纯函数
 * - parseOmoPlan 扩展: Success Criteria `- [ ]` 解析
 * - validate_plan_completion tool execute()
 */

import { describe, expect, test } from "bun:test"
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseOmoPlan,
  validatePlanCompletion,
  validate_plan_completion,
} from "../omo-spec"

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

// ============================================================
// parseOmoPlan - Success Criteria 解析
// ============================================================

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

// ============================================================
// validatePlanCompletion 纯函数
// ============================================================

describe("validatePlanCompletion - 计数", () => {
  test("全未完成", () => {
    const c = validatePlanCompletion(PLAN_WITH_SC, "t")
    expect(c.todoTotal).toBe(2)
    expect(c.todoCompleted).toBe(0)
    expect(c.todoPending).toBe(2)
    expect(c.criteriaTotal).toBe(3)
    expect(c.criteriaCompleted).toBe(1)
    expect(c.criteriaPending).toBe(2)
    expect(c.hasContent).toBe(true)
    expect(c.allDone).toBe(false)
  })

  test("全完成", () => {
    const plan = `## TODOs\n#### 1. [x] a\n#### 2. [x] b\n## Success Criteria\n- [x] c1\n- [x] c2\n`
    const c = validatePlanCompletion(plan, "t")
    expect(c.todoCompleted).toBe(2)
    expect(c.criteriaCompleted).toBe(2)
    expect(c.allDone).toBe(true)
  })

  test("空 plan → hasContent=false, allDone=false", () => {
    const c = validatePlanCompletion("", "t")
    expect(c.hasContent).toBe(false)
    expect(c.allDone).toBe(false)
  })

  test("只有 TODOs 无 SC → hasContent=true, allDone 取决于 todos", () => {
    const c = validatePlanCompletion(
      "## TODOs\n#### 1. [x] a\n## Success Criteria\n- description\n",
      "t"
    )
    expect(c.todoTotal).toBe(1)
    expect(c.criteriaTotal).toBe(0)
    expect(c.criteriaPending).toBe(0)
    expect(c.allDone).toBe(true)
  })

  test("FVW 任务不计入 todo 计数", () => {
    const plan = `## TODOs\n#### 1. [x] a\n## Final Verification Wave\n### F1. [ ] fvw\n## Success Criteria\n- [x] c\n`
    const c = validatePlanCompletion(plan, "t")
    expect(c.todoTotal).toBe(1)
    expect(c.allDone).toBe(true)
  })
})

// ============================================================
// validate_plan_completion tool execute()
// ============================================================

describe("validate_plan_completion tool execute()", () => {
  function setupPlan(tmp: string, name: string, content: string) {
    mkdirSync(join(tmp, ".omo", "plans"), { recursive: true })
    writeFileSync(join(tmp, ".omo", "plans", `${name}.md`), content)
  }

  test("未全完成 → 输出进度", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-vpc-partial-"))
    try {
      setupPlan(tmp, "feat", PLAN_WITH_SC)
      const r = await (validate_plan_completion as any).execute(
        { change_name: "feat" },
        { directory: tmp }
      )
      expect(r.output).toContain("0/2 todos")
      expect(r.output).toContain("1/3 criteria")
      expect(r.metadata.allDone).toBe(false)
      expect(r.metadata.todoPending).toBe(2)
      expect(r.metadata.criteriaPending).toBe(2)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("全完成 → 输出 all done", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-vpc-alldone-"))
    try {
      const plan = "## TODOs\n#### 1. [x] a\n#### 2. [x] b\n## Success Criteria\n- [x] c1\n- [x] c2\n"
      setupPlan(tmp, "feat", plan)
      const r = await (validate_plan_completion as any).execute(
        { change_name: "feat" },
        { directory: tmp }
      )
      expect(r.output).toContain("全部完成")
      expect(r.metadata.allDone).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("空 plan (无 task 无 SC) → hasContent=false", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-vpc-empty-"))
    try {
      setupPlan(tmp, "feat", "## TL;DR\nT\n## Context\nC\n")
      const r = await (validate_plan_completion as any).execute(
        { change_name: "feat" },
        { directory: tmp }
      )
      expect(r.output).toContain("无需检查")
      expect(r.metadata.hasContent).toBe(false)
      expect(r.metadata.allDone).toBe(false)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test("plan 不存在 → throw", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "omo-vpc-noplan-"))
    try {
      await expect(
        (validate_plan_completion as any).execute(
          { change_name: "ghost" },
          { directory: tmp }
        )
      ).rejects.toThrow(/plan 文件不存在/)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
