#!/usr/bin/env bun test
/**
 * gen-source-plan 单元测试
 *
 * 覆盖:artifact 加载 / requires 解析 / 语言替换 / Wave 生成 / Schema 生成 / Template 生成 / 整体生成 / 依赖树
 * 运行: bun test omo-spec/skills/omo-spec/scripts/__tests__/gen-source-plan.test.ts
 */

import { describe, expect, test } from "bun:test"
import {
  generateSchemasBlock,
  generateSourcePlan,
  generateTargetArtifactsYaml,
  generateTemplatesBlock,
  generateWavesBlock,
  getNextSelectableArtifacts,
  listAvailableArtifacts,
  listAvailableArtifactsWithRequires,
  loadArtifacts,
  parseRequires,
  replaceLanguage,
  type ArtifactDef,
  type LangMode,
} from "../gen-source-plan"

// ============================================================
// 1. parseRequires
// ============================================================

describe("parseRequires", () => {
  test("解析 requires: []", () => {
    expect(parseRequires("requires: []\ncontent")).toEqual([])
  })

  test("解析 requires: [proposal]", () => {
    expect(parseRequires("requires: [proposal]\ncontent")).toEqual(["proposal"])
  })

  test("解析 requires: [proposal, design]", () => {
    expect(parseRequires("requires: [proposal, design]\ncontent")).toEqual(["proposal", "design"])
  })

  test("没有 requires 字段返回空数组", () => {
    expect(parseRequires("no requires here")).toEqual([])
  })

  test("requires 在中间行", () => {
    const content = "line1\nrequires: [a, b]\nline3"
    expect(parseRequires(content)).toEqual(["a", "b"])
  })
})

// ============================================================
// 2. loadArtifacts
// ============================================================

describe("loadArtifacts", () => {
  test("加载真实 artifacts(proposal)", () => {
    const repoRoot = process.cwd()
    const artifacts = loadArtifacts(repoRoot, ["proposal"])
    expect(artifacts).toHaveLength(1)
    expect(artifacts[0]?.id).toBe("proposal")
    expect(artifacts[0]?.instruction.length).toBeGreaterThan(0)
    expect(artifacts[0]?.template.length).toBeGreaterThan(0)
    expect(artifacts[0]?.requires).toEqual([])
  })

  test("加载多个 artifacts(proposal + design)", () => {
    const repoRoot = process.cwd()
    const artifacts = loadArtifacts(repoRoot, ["proposal", "design"])
    expect(artifacts).toHaveLength(2)
    expect(artifacts[0]?.id).toBe("proposal")
    expect(artifacts[0]?.requires).toEqual([])
    expect(artifacts[1]?.id).toBe("design")
    expect(artifacts[1]?.requires).toEqual(["proposal"])
  })

  test("加载全部 artifacts", () => {
    const repoRoot = process.cwd()
    const artifacts = loadArtifacts(repoRoot, ["proposal", "design", "spec"])
    expect(artifacts).toHaveLength(3)
    expect(artifacts[2]?.id).toBe("spec")
    expect(artifacts[2]?.requires).toEqual(["proposal", "design"])
  })

  test("不存在的 artifact 抛错", () => {
    const repoRoot = process.cwd()
    expect(() => loadArtifacts(repoRoot, ["nonexistent"])).toThrow("Artifact 目录不存在")
  })
})

// ============================================================
// 3. listAvailableArtifacts
// ============================================================

describe("listAvailableArtifacts", () => {
  test("列出真实 artifacts 目录", () => {
    const repoRoot = process.cwd()
    const available = listAvailableArtifacts(repoRoot)
    expect(available).toContain("proposal")
    expect(available).toContain("design")
    expect(available).toContain("spec")
  })

  test("不存在的目录返回空数组", () => {
    const available = listAvailableArtifacts("/nonexistent/path/xyz")
    expect(available).toEqual([])
  })
})

// ============================================================
// 4. listAvailableArtifactsWithRequires
// ============================================================

describe("listAvailableArtifactsWithRequires", () => {
  test("列出真实 artifacts 及 requires", () => {
    const repoRoot = process.cwd()
    const artifacts = listAvailableArtifactsWithRequires(repoRoot)
    expect(artifacts.length).toBeGreaterThanOrEqual(3)
    const proposal = artifacts.find((a) => a.id === "proposal")
    expect(proposal?.requires).toEqual([])
    const design = artifacts.find((a) => a.id === "design")
    expect(design?.requires).toEqual(["proposal"])
  })
})

// ============================================================
// 5. getNextSelectableArtifacts
// ============================================================

describe("getNextSelectableArtifacts", () => {
  const allArtifacts: ArtifactDef[] = [
    { id: "proposal", instruction: "", template: "", requires: [] },
    { id: "design", instruction: "", template: "", requires: ["proposal"] },
    { id: "specs", instruction: "", template: "", requires: ["proposal", "design"] },
  ]

  test("第一轮:只有 root 节点可选", () => {
    const next = getNextSelectableArtifacts(allArtifacts, [])
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe("proposal")
  })

  test("选 proposal 后:design 可选", () => {
    const next = getNextSelectableArtifacts(allArtifacts, ["proposal"])
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe("design")
  })

  test("选 proposal + design 后:specs 可选", () => {
    const next = getNextSelectableArtifacts(allArtifacts, ["proposal", "design"])
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe("specs")
  })

  test("全部选中后:无更多可选", () => {
    const next = getNextSelectableArtifacts(allArtifacts, ["proposal", "design", "specs"])
    expect(next).toHaveLength(0)
  })

  test("多 parent 依赖:只有全部 parent 选中才可选", () => {
    const artifacts: ArtifactDef[] = [
      { id: "a", instruction: "", template: "", requires: [] },
      { id: "b", instruction: "", template: "", requires: [] },
      { id: "c", instruction: "", template: "", requires: ["a", "b"] },
    ]
    // 只选 a,c 不可选
    expect(getNextSelectableArtifacts(artifacts, ["a"])).toHaveLength(1)
    expect(getNextSelectableArtifacts(artifacts, ["a"])[0]?.id).toBe("b")
    // 选 a + b 后,c 可选
    expect(getNextSelectableArtifacts(artifacts, ["a", "b"])).toHaveLength(1)
    expect(getNextSelectableArtifacts(artifacts, ["a", "b"])[0]?.id).toBe("c")
  })
})

// ============================================================
// 6. replaceLanguage
// ============================================================

describe("replaceLanguage", () => {
  const sample = `__LANG_PLACEHOLDER__

PHASE 1
content`

  test("auto 模式(默认)删除占位符所在行", () => {
    const result = replaceLanguage(sample, "auto")
    expect(result).not.toContain("__LANG_PLACEHOLDER__")
    expect(result).toContain("PHASE 1")
    expect(result).toContain("content")
  })

  test("zh 模式替换为中文提示", () => {
    const result = replaceLanguage(sample, "zh")
    expect(result).toContain("**语言**: 所有生成的文档必须使用中文。")
    expect(result).not.toContain("__LANG_PLACEHOLDER__")
  })

  test("en 模式替换为英文提示", () => {
    const result = replaceLanguage(sample, "en")
    expect(result).toContain("**Language**: All generated documents MUST be written in English.")
    expect(result).not.toContain("__LANG_PLACEHOLDER__")
  })

  test("多次出现全部替换(auto)", () => {
    const text = `__LANG_PLACEHOLDER__\nfoo\n__LANG_PLACEHOLDER__\nbar`
    const result = replaceLanguage(text, "auto")
    expect(result).not.toContain("__LANG_PLACEHOLDER__")
    expect(result).toContain("foo")
    expect(result).toContain("bar")
  })

  test("多次出现全部替换(zh)", () => {
    const text = `__LANG_PLACEHOLDER__\nfoo`
    const result = replaceLanguage(text, "zh")
    expect((result.match(/\*\*语言\*\*/g) || []).length).toBe(1)
  })

  test("无占位符时不变", () => {
    const text = "no placeholder here"
    expect(replaceLanguage(text, "auto")).toBe(text)
    expect(replaceLanguage(text, "zh")).toBe(text)
    expect(replaceLanguage(text, "en")).toBe(text)
  })

  test("处理 CRLF 行尾(auto)", () => {
    const text = "before\r\n__LANG_PLACEHOLDER__\r\nafter"
    const result = replaceLanguage(text, "auto")
    expect(result).not.toContain("__LANG_PLACEHOLDER__")
    expect(result).toContain("before")
    expect(result).toContain("after")
  })
})

// ============================================================
// 7. generateTargetArtifactsYaml
// ============================================================

describe("generateTargetArtifactsYaml", () => {
  test("单 artifact", () => {
    const yaml = generateTargetArtifactsYaml(["proposal"])
    expect(yaml).toBe("  - proposal")
  })

  test("多 artifact,每行 1 个,2 空格缩进", () => {
    const yaml = generateTargetArtifactsYaml(["proposal", "design", "spec"])
    expect(yaml).toBe(
      "  - proposal\n  - design\n  - spec"
    )
  })

  test("空数组返回空字符串", () => {
    expect(generateTargetArtifactsYaml([])).toBe("")
  })
})

// ============================================================
// 8. generateWavesBlock
// ============================================================

describe("generateWavesBlock", () => {
  const fakeArtifacts: ArtifactDef[] = [
    {
      id: "proposal",
      instruction: "proposal instruction",
      template: "## Why\n\n<!-- Why? -->",
      requires: [],
    },
    {
      id: "design",
      instruction: "design instruction",
      template: "## Context\n\n<!-- Context? -->",
      requires: ["proposal"],
    },
    {
      id: "spec",
      instruction: "spec instruction",
      template: "## ADDED Requirements\n\n### Requirement: ...",
      requires: ["proposal", "design"],
    },
  ]

  test("生成 2 个 Wave 章节", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    expect(block).toContain("### Wave 1: 基础 artifacts")
    expect(block).toContain("### Wave 2: spec + target-plan")
  })

  test("每个 Wave 含正确的 task 编号", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    expect(block).toContain("  - [ ] 1.1 生成 proposal")
    expect(block).toContain("  - [ ] 1.2 生成 design")
    expect(block).toContain("  - [ ] 2.1 生成 spec")
    expect(block).toContain("  - [ ] 2.2 生成 target-plan")
  })

  test("每个 task 含 References 字段", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    expect(block).toContain("omo-spec/artifacts/proposal/instruction.md")
    expect(block).toContain("omo-spec/artifacts/design/instruction.md")
    expect(block).toContain("omo-spec/artifacts/spec/instruction.md")
  })

  test("每个 task 含 Acceptable Agent Profile 字段", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    expect(block).toContain("category=\"unspecified-low\"")
  })

  test("含 4 个 task(单空格缩进格式)", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    const taskMatches = block.match(/  - \[ \] \d+\.\d+ /g)
    expect(taskMatches).not.toBeNull()
    expect(taskMatches?.length).toBe(4)
  })

  test("spec 和 design 引用前置产物", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    expect(block).toContain("spec/test-change/proposal.md")
    expect(block).toContain("spec/test-change/design.md")
  })

  test("target-plan 写入 .omo/plans/", () => {
    const block = generateWavesBlock(fakeArtifacts, "test-change")
    expect(block).toContain(".omo/plans/test-change.md")
  })
})

// ============================================================
// 9. generateSchemasBlock
// ============================================================

describe("generateSchemasBlock", () => {
  const fakeArtifacts: ArtifactDef[] = [
    {
      id: "proposal",
      instruction: "PHASE 1\nDo X\n\n__LANG_PLACEHOLDER__",
      template: "",
      requires: [],
    },
    {
      id: "design",
      instruction: "PHASE 2\nDo Y",
      template: "",
      requires: ["proposal"],
    },
  ]

  test("每个 artifact 一节(7.1, 7.2)", () => {
    const block = generateSchemasBlock(fakeArtifacts, "auto")
    expect(block).toContain("### 7.1 proposal.instruction")
    expect(block).toContain("### 7.2 design.instruction")
  })

  test("instruction 全文嵌入(用 markdown code fence 包裹)", () => {
    const block = generateSchemasBlock(fakeArtifacts, "auto")
    expect(block).toContain("```markdown")
    expect(block).toContain("PHASE 1")
    expect(block).toContain("Do X")
    expect(block).toContain("PHASE 2")
    expect(block).toContain("Do Y")
  })

  test("auto 模式删除 __LANG_PLACEHOLDER__ 所在行", () => {
    const block = generateSchemasBlock(fakeArtifacts, "auto")
    expect(block).not.toContain("__LANG_PLACEHOLDER__")
    expect(block).toContain("PHASE 1")
    expect(block).toContain("Do X")
  })

  test("zh 模式替换为中文提示", () => {
    const block = generateSchemasBlock(fakeArtifacts, "zh")
    expect(block).toContain("**语言**: 所有生成的文档必须使用中文。")
  })

  test("en 模式替换为英文提示", () => {
    const block = generateSchemasBlock(fakeArtifacts, "en")
    expect(block).toContain("**Language**: All generated documents MUST be written in English.")
  })

  test("用 <details> 折叠", () => {
    const block = generateSchemasBlock(fakeArtifacts, "auto")
    expect(block).toContain("<details>")
    expect(block).toContain("</details>")
  })
})

// ============================================================
// 10. generateTemplatesBlock
// ============================================================

describe("generateTemplatesBlock", () => {
  const fakeArtifacts: ArtifactDef[] = [
    {
      id: "proposal",
      instruction: "",
      template: "## Why\n\n<!-- Why? -->\n",
      requires: [],
    },
    {
      id: "design",
      instruction: "",
      template: "## Context\n\n<!-- Context? -->\n",
      requires: [],
    },
  ]

  test("每个 artifact 一节(8.1, 8.2)", () => {
    const block = generateTemplatesBlock(fakeArtifacts)
    expect(block).toContain("### 8.1 proposal template")
    expect(block).toContain("### 8.2 design template")
  })

  test("template 全文嵌入", () => {
    const block = generateTemplatesBlock(fakeArtifacts)
    expect(block).toContain("## Why")
    expect(block).toContain("## Context")
  })

  test("用 markdown code fence 包裹", () => {
    const block = generateTemplatesBlock(fakeArtifacts)
    expect(block).toContain("```markdown")
  })
})

// ============================================================
// 11. generateSourcePlan (集成)
// ============================================================

describe("generateSourcePlan", () => {
  const fakeArtifacts: ArtifactDef[] = [
    {
      id: "proposal",
      instruction: "P instr",
      template: "## Why\n",
      requires: [],
    },
  ]
  const tplContent = `## TL;DR
{{TLDR}}

## Context
{{CONTEXT}}

## Work Objectives
{{WORK_OBJECTIVES}}

## Verification Strategy
{{VERIFICATION_STRATEGY}}

## Execution Strategy
{{EXECUTION_STRATEGY}}

## Tasks
{{WAVES_BLOCK}}

## Final Verification Wave
{{FVW_BLOCK}}

## Commit Strategy
{{COMMIT_STRATEGY}}

## Success Criteria
{{SUCCESS_CRITERIA}}
`

  test("替换所有占位符", () => {
    const result = generateSourcePlan({
      changeName: "test-change",
      artifacts: fakeArtifacts,
      templateContent: tplContent,
      lang: "auto",
    })
    expect(result).not.toMatch(/\{\{[A-Z_0-9]+\}\}/)
    expect(result).toContain("test-change")
  })

  test("残留占位符抛错", () => {
    const brokenTpl = `## TL;DR
{{TLDR}}

unknown: {{UNRESOLVED_X}}
`
    expect(() =>
      generateSourcePlan({
        changeName: "test",
        artifacts: fakeArtifacts,
        templateContent: brokenTpl,
      })
    ).toThrow("未替换的占位符残留")
  })

  test("生成 plan 含 spec 路径引用 change 名", () => {
    const result = generateSourcePlan({
      changeName: "test-change",
      artifacts: fakeArtifacts,
      templateContent: tplContent,
    })
    expect(result).toContain("spec/test-change/")
  })
})
