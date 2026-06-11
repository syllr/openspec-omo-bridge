#!/usr/bin/env bun test
/**
 * 额外详细测试：涵盖更特殊的场景
 */

import { describe, expect, test } from "bun:test"
import {
  generateOpenSpecTasks,
  parseOmoPlan,
} from "../sync-plan-to-tasks"

describe("嵌套结构", () => {
  test("三层嵌套列表", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Steps**:\n  - level 1\n    - level 2a\n    - level 2b\n      - level 3\n    - level 2c\n  - level 1 again\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("level 3")
    expect(plan.tasks[0].fields[0].value).toContain("level 2c")
  })

  test("嵌套有序列表（数字）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Steps**:\n  1. first\n  2. second\n  3. third\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("1. first")
    expect(plan.tasks[0].fields[0].value).toContain("3. third")
  })

  test("混合列表样式", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Mixed**:\n  - bullet\n  1. numbered\n  - bullet again\n  2. numbered again\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("bullet")
    expect(plan.tasks[0].fields[0].value).toContain("numbered")
  })

  test("续行含表格", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Table**:\n  | A | B |\n  |---|---|\n  | 1 | 2 |\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("| A | B |")
  })
})

describe("Markdown 语法变体", () => {
  test("任务行含 :emoji: shortcode", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] rocket : emoji\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("rocket : emoji")
  })

  test("任务行含 $ 数学公式", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] compute \$O(n\\\\log n)\$\n`,
      "t"
    )
    expect(plan.tasks[0].title).toContain("O(n")
  })

  test("字段名含特殊字符", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field (中文)**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toContain("Field")
  })

  test("任务标题含反引号代码块嵌套", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] use \`\`inline code\`\` here\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("use ``inline code`` here")
  })

  test("字段值含 HTML 标签", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**: use <br> for line break\n  <sub>subscript</sub>\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("<br>")
    expect(plan.tasks[0].fields[0].value).toContain("<sub>")
  })

  test("字段值含脚注", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Ref**: see [^1]\n\n  [^1]: footnote text\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("[^1]")
  })
})

describe("混合内容 reference section", () => {
  test("reference 含 mermaid 图", () => {
    const plan = parseOmoPlan(
      `## 1. Architecture
\`\`\`mermaid
graph TD
  A --> B
  B --> C
\`\`\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("```mermaid")
    expect(plan.sections[0].body).toContain("graph TD")
  })

  test("reference 含 SVG", () => {
    const plan = parseOmoPlan(
      `## 1. Logo
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" />
</svg>

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("<svg")
  })

  test("reference 含 ASCII art", () => {
    const plan = parseOmoPlan(
      `## 1. Diagram
\`\`\`
+---+
| A |
+---+
\`\`\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("+---+")
  })

  test("reference 含数学公式 LaTeX", () => {
    const plan = parseOmoPlan(
      `## 1. Formula
\$\$
E = mc^2
\$\$

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("E = mc^2")
  })

  test("reference 含 diff 语法", () => {
    const plan = parseOmoPlan(
      `## 1. Diff
\`\`\`diff
- old line
+ new line
\`\`\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("- old line")
    expect(plan.sections[0].body).toContain("+ new line")
  })

  test("reference 含 mermaid + 表格 + 文本混合", () => {
    const plan = parseOmoPlan(
      `## 1. Overview
Description paragraph.

| A | B |
|---|---|
| 1 | 2 |

\`\`\`mermaid
graph LR
  A --> B
\`\`\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    const body = plan.sections[0].body
    expect(body).toContain("Description paragraph.")
    expect(body).toContain("| A | B |")
    expect(body).toContain("```mermaid")
  })
})

describe("Wave 标题边界", () => {
  test("Wave 标题含代码括号", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: func() returns void\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: func() returns void")
  })

  test("Wave 标题含斜杠", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: read/write/connect\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: read/write/connect")
  })

  test("Wave 标题尾部无内容（只有 Wave N:）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1:\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1:")
  })

  test("Wave 标题纯空格", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1:    \n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1:")
  })

  test("Wave 编号从 0 开始（边界）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 0: prep\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 0: prep")
  })

  test("Wave 编号两位数", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 12: phase 12\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 12: phase 12")
  })
})

describe("任务 checkbox 状态复杂", () => {
  test("checkbox 后多余空格", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ]    extra spaces\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("extra spaces")
  })

  test("checkbox 后 tab 分隔", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ]\ttab separated\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("tab separated")
  })

  test("checkbox 内有空格 [ x ]", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ x ] t\n`, "t")
    expect(plan.tasks[0].completed).toBe(true)
  })

  test("checkbox 内有空格 [   x   ]", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [   x   ] t\n`,
      "t"
    )
    expect(plan.tasks[0].completed).toBe(true)
  })
})

describe("字段名称特殊", () => {
  test("字段名含斜杠", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Read/Write**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("Read/Write")
  })

  test("字段名含冒号（内部）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **HTTP: Method**: v\n`,
      "t"
    )
    // 第一个 : 是字段名的一部分，第二个 : 才是字段分隔符
    expect(plan.tasks[0].fields[0].name).toBe("HTTP: Method")
  })

  test("字段名含数字", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Step 1**: v\n- **Step 2**: w\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("Step 1")
    expect(plan.tasks[0].fields[1].name).toBe("Step 2")
  })

  test("字段名含下划线", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **snake_case_field**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("snake_case_field")
  })

  test("字段名含连字符", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **kebab-case-field**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("kebab-case-field")
  })
})

describe("字段值特殊模式", () => {
  test("字段值含 '>' 引用（无前置 -）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**: see below\n  > quoted line 1\n  > quoted line 2\n`,
      "t"
    )
    // '>' 开头以缩进继续，应作为续行
    expect(plan.tasks[0].fields[0].value).toContain("quoted line 1")
  })

  test("字段值以 \\n 续行但无缩进", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**: line 1\nline 2 (no indent)\n`,
      "t"
    )
    // 无缩进不是续行
    expect(plan.tasks[0].fields[0].value).toBe("line 1")
  })

  test("字段值仅含空白", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**:   \n`,
      "t"
    )
    // 空字段值，trim 后为空
    expect(plan.tasks[0].fields.length).toBe(1)
  })

  test("字段值以 ** 加粗结束", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**: see **bold** here\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("**bold**")
  })

  test("字段值含 backtick 代码", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Code**: use \`bun test\` or \`vitest\`\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("`bun test`")
    expect(plan.tasks[0].fields[0].value).toContain("`vitest`")
  })
})

describe("Reference Section 边界", () => {
  test("reference section 是代码块语言标识", () => {
    const plan = parseOmoPlan(
      `## 1. Spec

\`\`\`yaml
name: foo
version: 1
\`\`\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("```yaml")
  })

  test("reference 含嵌套引用", () => {
    const plan = parseOmoPlan(
      `## 1. Quotes
> outer
> > nested
> outer again

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("> outer")
    expect(plan.sections[0].body).toContain("> > nested")
  })

  test("reference 含 emoji + 表格 + 列表", () => {
    const plan = parseOmoPlan(
      `## 1. Summary
🎉 Launch!

- Feature A
- Feature B

| Metric | Value |
|--------|-------|
| Speed  | 100ms |

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    const body = plan.sections[0].body
    expect(body).toContain("🎉")
    expect(body).toContain("Feature A")
    expect(body).toContain("| Metric |")
  })
})

describe("空白字符 robustness", () => {
  test("仅含空格的 plan（不崩）", () => {
    const plan = parseOmoPlan("     \n     \n     \n", "t")
    expect(plan.sections.length).toBe(0)
  })

  test("仅含 tab 的 plan（不崩）", () => {
    const plan = parseOmoPlan("\t\t\t\n\t\t\t\n", "t")
    expect(plan.sections.length).toBe(0)
  })

  test("CRLF + LF + CR 混合（边缘）", () => {
    const plan = parseOmoPlan(
      "## TODOs\r\n#### 1. [ ] t1\n#### 2. [ ] t2\r\n",
      "t"
    )
    expect(plan.tasks.length).toBe(2)
  })

  test("任务行后跟中文逗号 ，", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t，trailing comma\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("t，trailing comma")
  })
})

describe("数字精度", () => {
  test("FVW 编号 0（边界）", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F0. [ ] zero\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F0")
  })

  test("FVW 编号 999（极端）", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F999. [ ] extreme\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F999")
  })

  test("FVW 编号 F001（带前导零）", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F001. [ ] zero padded\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F001")
  })
})

describe("Plan Reference 内容特殊字符", () => {
  test("reference 含裸 HTML 不转义", () => {
    const plan = parseOmoPlan(
      `## 1. Raw HTML
<div>raw</div>
<script>alert('xss')</script>

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("<div>raw</div>")
    expect(plan.sections[0].body).toContain("<script>")
  })

  test("reference 含 URL 短链", () => {
    const plan = parseOmoPlan(
      `## 1. Links
see https://example.com/very/long/path?param=value&other=value#anchor

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("https://example.com")
  })

  test("reference 含 base64 字符串", () => {
    const plan = parseOmoPlan(
      `## 1. Data
\`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("data:image/png;base64")
  })

  test("reference 含 shell 命令", () => {
    const plan = parseOmoPlan(
      `## 1. Setup
\`\`\`bash
sudo apt-get install -y nodejs
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
npm install -g openspec
\`\`\`

## TODOs
#### 1. [ ] t
`,
      "t"
    )
    expect(plan.sections[0].body).toContain("sudo apt-get")
  })
})
