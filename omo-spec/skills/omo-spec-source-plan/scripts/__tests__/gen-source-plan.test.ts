#!/usr/bin/env bun test
/**
 * gen-source-plan 单元测试
 *
 * 覆盖 7 大类:schema 解析 / 语言替换 / 6 章生成 / 7 章生成 / 8 章生成 / 整体生成 / config 读取
 * 运行: bun test omo-spec/skills/omo-spec-source-plan/scripts/__tests__/gen-source-plan.test.ts
 */

import { describe, expect, test } from "bun:test"
import {
  generateSchemasBlock,
  generateSourcePlan,
  generateTargetArtifactsYaml,
  generateTemplatesBlock,
  generateWavesBlock,
  parseSchema,
  readDefaultSchema,
  replaceLanguage,
  type LangMode,
  type SchemaArtifact,
} from "../gen-source-plan"

// ============================================================
// 1. parseSchema
// ============================================================

describe("parseSchema", () => {
  test("解析 spec-driven 真实 schema.yaml", () => {
    const real = `name: spec-driven
version: 1
description: Default workflow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal
    template: proposal.md
    tracks: proposal.md
    instruction: |
      proposal instruction
    requires: []
apply:
  requires:
    - tasks
  tracks: tasks.md
  instruction: apply instruction
`
    const schema = parseSchema(real)
    expect(schema.name).toBe("spec-driven")
    expect(schema.version).toBe(1)
    expect(schema.artifacts).toHaveLength(1)
    expect(schema.artifacts[0]?.id).toBe("proposal")
    expect(schema.artifacts[0]?.requires).toEqual([])
    expect(schema.apply.requires).toEqual(["tasks"])
  })

  test("解析 constitution 真实 schema.yaml(2 artifacts)", () => {
    const real = `name: constitution
version: 1
description: Constitution
artifacts:
  - id: scan
    generates: scan.md
    description: Scan
    template: scan.md
    tracks: scan.md
    instruction: scan instr
    requires: []
  - id: design
    generates: design.md
    description: Design
    template: design.md
    tracks: design.md
    instruction: design instr
    requires:
      - scan
apply:
  requires:
    - design
  tracks: design.md
  instruction: apply instr
`
    const schema = parseSchema(real)
    expect(schema.artifacts).toHaveLength(2)
    expect(schema.artifacts[0]?.id).toBe("scan")
    expect(schema.artifacts[1]?.id).toBe("design")
    expect(schema.artifacts[1]?.requires).toEqual(["scan"])
  })

  test("解析缺失字段时抛错", () => {
    expect(() => parseSchema("just: a string")).toThrow("缺少 name 或 artifacts")
  })

  test("解析空字符串抛错", () => {
    expect(() => parseSchema("")).toThrow("根对象为空或非对象")
  })

  test("artifacts 为空数组", () => {
    const schema = parseSchema("name: empty\nartifacts: []\n")
    expect(schema.artifacts).toEqual([])
    expect(schema.apply.requires).toEqual([])
  })
})

// ============================================================
// 2. replaceLanguage
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
// 3. generateTargetArtifactsYaml
// ============================================================

describe("generateTargetArtifactsYaml", () => {
  test("单 artifact", () => {
    const yaml = generateTargetArtifactsYaml([
      { id: "a", generates: "a.md" } as SchemaArtifact,
    ])
    expect(yaml).toBe("  - a.md")
  })

  test("多 artifact,每行 1 个,2 空格缩进", () => {
    const yaml = generateTargetArtifactsYaml([
      { id: "proposal", generates: "proposal.md" } as SchemaArtifact,
      { id: "design", generates: "design.md" } as SchemaArtifact,
      { id: "specs", generates: "specs/**/*.md" } as SchemaArtifact,
    ])
    expect(yaml).toBe(
      "  - proposal.md\n  - design.md\n  - specs/**/*.md"
    )
  })

  test("空数组返回空字符串", () => {
    expect(generateTargetArtifactsYaml([])).toBe("")
  })
})

// ============================================================
// 4. generateWavesBlock
// ============================================================

describe("generateWavesBlock", () => {
  const fakeArtifacts: SchemaArtifact[] = [
    {
      id: "proposal",
      generates: "proposal.md",
      description: "Initial proposal",
      template: "proposal.md",
      tracks: "proposal.md",
      instruction: "...",
      requires: [],
    },
    {
      id: "design",
      generates: "design.md",
      description: "Design",
      template: "design.md",
      tracks: "design.md",
      instruction: "...",
      requires: ["proposal"],
    },
    {
      id: "specs",
      generates: "specs/**/*.md",
      description: "Specs",
      template: "spec.md",
      tracks: "specs/**/*.md",
      instruction: "...",
      requires: ["proposal", "design"],
    },
    {
      id: "tasks",
      generates: "tasks.md",
      description: "Tasks",
      template: "tasks.md",
      tracks: "tasks.md",
      instruction: "...",
      requires: ["specs", "design"],
    },
  ]

  test("4 artifacts 生成 4 个 Wave 章节", () => {
    const block = generateWavesBlock(fakeArtifacts)
    expect(block).toContain("### 6.1 Wave 1: proposal")
    expect(block).toContain("### 6.2 Wave 2: design")
    expect(block).toContain("### 6.3 Wave 3: specs")
    expect(block).toContain("### 6.4 Wave 4: tasks")
  })

  test("每个 Wave 含 1 个 task(#### N. [ ])", () => {
    const block = generateWavesBlock(fakeArtifacts)
    const taskMatches = block.match(/#### \d+\. \[ \]/g)
    expect(taskMatches).not.toBeNull()
    expect(taskMatches?.length).toBe(4)
  })

  test("每个 task 显式引用第 7/8 章(Embedded Reference)", () => {
    const block = generateWavesBlock(fakeArtifacts)
    expect(block).toContain("第 7.1 节")
    expect(block).toContain("第 8.1 节")
    expect(block).toContain("第 7.2 节")
    expect(block).toContain("第 8.2 节")
  })

  test("specs artifact 标注 Output Path 含 <capability>", () => {
    const block = generateWavesBlock(fakeArtifacts)
    expect(block).toContain("每个 capability 一个文件")
  })

  test("每个 task 含 Review Checkpoint 字段", () => {
    const block = generateWavesBlock(fakeArtifacts)
    expect(block.match(/Review Checkpoint/g)?.length).toBe(4)
  })

  test("每个 task 含 Agent Profile 字段", () => {
    const block = generateWavesBlock(fakeArtifacts)
    expect(block.match(/Agent Profile/g)?.length).toBe(4)
  })

  test("2 artifacts (constitution) 生成 2 Waves", () => {
    const constitutionArtifacts = fakeArtifacts.slice(0, 2)
    const block = generateWavesBlock(constitutionArtifacts)
    expect(block).toContain("### 6.1 Wave 1: proposal")
    expect(block).toContain("### 6.2 Wave 2: design")
    expect(block).not.toContain("### 6.3")
  })
})

// ============================================================
// 5. generateSchemasBlock
// ============================================================

describe("generateSchemasBlock", () => {
  const fakeArtifacts: SchemaArtifact[] = [
    {
      id: "proposal",
      generates: "proposal.md",
      description: "",
      template: "proposal.md",
      tracks: "proposal.md",
      instruction: "PHASE 1\nDo X\n\n__LANG_PLACEHOLDER__",
      requires: [],
    },
    {
      id: "design",
      generates: "design.md",
      description: "",
      template: "design.md",
      tracks: "design.md",
      instruction: "PHASE 2\nDo Y",
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
// 6. generateTemplatesBlock
// ============================================================

describe("generateTemplatesBlock", () => {
  const fakeArtifacts: SchemaArtifact[] = [
    {
      id: "proposal",
      generates: "proposal.md",
      description: "",
      template: "proposal.md",
      tracks: "",
      instruction: "",
      requires: [],
    },
    {
      id: "design",
      generates: "design.md",
      description: "",
      template: "design.md",
      tracks: "",
      instruction: "",
      requires: [],
    },
  ]
  const templates = new Map<string, string>([
    ["proposal.md", "## Why\n\n<!-- Why? -->\n"],
    ["design.md", "## Context\n\n<!-- Context? -->\n"],
  ])

  test("每个 artifact 一节(8.1, 8.2)", () => {
    const block = generateTemplatesBlock(fakeArtifacts, templates)
    expect(block).toContain("### 8.1 proposal template")
    expect(block).toContain("### 8.2 design template")
  })

  test("template 全文嵌入", () => {
    const block = generateTemplatesBlock(fakeArtifacts, templates)
    expect(block).toContain("## Why")
    expect(block).toContain("## Context")
  })

  test("用 markdown code fence 包裹", () => {
    const block = generateTemplatesBlock(fakeArtifacts, templates)
    expect(block).toContain("```markdown")
  })

  test("缺失 template 显示占位注释", () => {
    const block = generateTemplatesBlock(fakeArtifacts, new Map())
    expect(block).toContain("<!-- template 文件不存在: proposal.md -->")
  })
})

// ============================================================
// 7. generateSourcePlan (集成)
// ============================================================

describe("generateSourcePlan", () => {
  const fakeArtifacts: SchemaArtifact[] = [
    {
      id: "proposal",
      generates: "proposal.md",
      description: "P",
      template: "proposal.md",
      tracks: "proposal.md",
      instruction: "P instr",
      requires: [],
    },
  ]
  const templates = new Map([["proposal.md", "## Why\n"]])
  const tplContent = `---
schema: {{SCHEMA_NAME}}
changeName: {{CHANGE_NAME}}
date: "{{DATE}}"
artifacts:
{{TARGET_ARTIFACTS_YAML}}
---

# Source Plan: {{CHANGE_NAME}}

## 1. TL;DR
{{WAVES_BLOCK}}

## 7. Schema
{{SCHEMAS_BLOCK}}

## 8. Template
{{TEMPLATES_BLOCK}}
`

  test("替换所有占位符", () => {
    const result = generateSourcePlan({
      schemaName: "spec-driven",
      changeName: "test-change",
      schema: {
        name: "spec-driven",
        version: 1,
        description: "",
        artifacts: fakeArtifacts,
        apply: { requires: [], tracks: "", instruction: "" },
      },
      templates,
      templateContent: tplContent,
      lang: "auto",
    })
    expect(result).not.toMatch(/\{\{[A-Z_0-9]+\}\}/)
    expect(result).toContain("schema: spec-driven")
    expect(result).toContain("changeName: test-change")
  })

  test("残留占位符抛错", () => {
    const brokenTpl = `---
schema: {{SCHEMA_NAME}}
unknown: {{UNRESOLVED_X}}
---
`
    expect(() =>
      generateSourcePlan({
        schemaName: "spec-driven",
        changeName: "test",
        schema: {
          name: "spec-driven",
          version: 1,
          description: "",
          artifacts: fakeArtifacts,
          apply: { requires: [], tracks: "", instruction: "" },
        },
        templates,
        templateContent: brokenTpl,
      })
    ).toThrow("未替换的占位符残留")
  })

  test("DATE 占位符格式为 YYYY-MM-DD", () => {
    const result = generateSourcePlan({
      schemaName: "spec-driven",
      changeName: "x",
      schema: {
        name: "spec-driven",
        version: 1,
        description: "",
        artifacts: fakeArtifacts,
        apply: { requires: [], tracks: "", instruction: "" },
      },
      templates,
      templateContent: tplContent,
    })
    const dateMatch = result.match(/date: "(\d{4}-\d{2}-\d{2})"/)
    expect(dateMatch).not.toBeNull()
  })
})

// ============================================================
// 8. readDefaultSchema
// ============================================================

describe("readDefaultSchema", () => {
  test("config 不存在返回 null", () => {
    const result = readDefaultSchema("/nonexistent/path/xyz")
    expect(result).toBeNull()
  })
})
