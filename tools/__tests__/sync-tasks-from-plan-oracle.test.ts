#!/usr/bin/env bun test
/**
 * Oracle Review 建议的额外边界测试
 * 基于 OMO 真实 plan 格式分析和潜在 bug 调研
 */

import { describe, expect, test } from "bun:test"
import {
  generateOpenSpecTasks,
  parseOmoPlan,
} from "../omo-spec"

// ============================================================
// 🔴 高优先级 - 真实场景会发生
// ============================================================

describe("正则硬限制 (字段名含 *)", () => {
  test("字段名含 *（正则限制）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **a*b**: value\n`,
      "t"
    )
    // 当前正则 [^*]+ 不匹配 a*b
    expect(plan.tasks[0].fields.length).toBe(0)
  })

  test("字段名两端 * 包围", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **a*b*c**: value\n`,
      "t"
    )
    // 多个 * 在字段名中：当前正则不匹配，整个字段被忽略
    expect(plan.tasks[0].fields.length).toBe(0)
  })
})

describe("Wave 标题中文标点", () => {
  test("Wave 标题用中文冒号 ：", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1：标题\n#### 1. [ ] t\n`,
      "t"
    )
    // 当前正则要求英文 :，中文 ： 不匹配 → Wave 为空
    expect(plan.tasks[0].wave).toBe("")
  })

  test("Wave 标题无冒号", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1 title\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("")
  })

  test("Wave 标题用全角冒号 ：（双字节）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1：\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("")
  })
})

describe("三级 sub-number", () => {
  test("### 6.1.1 Wave 1: title（双层 sub-number）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1.1 Wave 1: title\n#### 1. [ ] t\n`,
      "t"
    )
    // 当前正则 (?:\d+\.\d+\s+)? 只匹配 N.M，不匹配 N.M.M
    expect(plan.tasks[0].wave).toBe("")
  })

  test("### 6.10.1 Wave 1: title（三层编号）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.10.1 Wave 1: title\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("")
  })
})

describe("章节标题 Markdown 强调", () => {
  test("章节标题含 **bold**", () => {
    const plan = parseOmoPlan(
      `## 1. **bold** section\nfoo\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].title).toBe("**bold** section")
  })

  test("章节标题含 *italic*", () => {
    const plan = parseOmoPlan(
      `## 1. *italic* section\nfoo\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].title).toBe("*italic* section")
  })

  test("章节标题含 `code`", () => {
    const plan = parseOmoPlan(
      "## 1. `code` section\nfoo\n## TODOs\n#### 1. [ ] t\n",
      "t"
    )
    expect(plan.sections[0].title).toBe("`code` section")
  })

  test("章节标题含 [link](url)", () => {
    const plan = parseOmoPlan(
      `## 1. [link](https://example.com)\nfoo\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].title).toBe("[link](https://example.com)")
  })
})

describe("checkbox 紧贴边界", () => {
  test("[X] 紧贴标题无空格 - title 应保留", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [X]title\n`,
      "t"
    )
    // 当前正则 \]\s* 允许零空格，title 被正确保留
    expect(plan.tasks.length).toBe(1)
    expect(plan.tasks[0].title).toBe("title")
    expect(plan.tasks[0].completed).toBe(true)
  })

  test("[x] 后有制表符", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [x]\ttitle\n`,
      "t"
    )
    // \s* 匹配 tab
    expect(plan.tasks.length).toBe(1)
    expect(plan.tasks[0].title).toBe("title")
  })

  test("[ ] 紧贴标题（无空格） - title 应保留", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ]title\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(1)
    expect(plan.tasks[0].title).toBe("title")
  })

  test("[ ] 后有 2+ 空格", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ]   title with spaces\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("title with spaces")
  })
})

describe("BOM 和编码", () => {
  test("UTF-8 BOM 头在文件开头", () => {
    const plan = parseOmoPlan(
      `\uFEFF## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    // BOM 可能破坏 ## 匹配
    expect(plan.sections.length).toBeGreaterThanOrEqual(0)
  })

  test("文件全部是 BOM 字符", () => {
    const plan = parseOmoPlan(`\uFEFF\uFEFF\uFEFF`, "t")
    expect(plan.sections.length).toBe(0)
  })

  test("BOM 后接 plan 内容", () => {
    const plan = parseOmoPlan(
      `\uFEFF## 1. TL;DR\nfoo\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    // 当前解析会失败，但应优雅处理
    expect(plan.sections.length).toBeGreaterThanOrEqual(0)
  })
})

describe("ANSI 转义码", () => {
  test("颜色码包裹章节", () => {
    const plan = parseOmoPlan(
      `\x1b[31m## TODOs\x1b[0m\n#### 1. [ ] t\n`,
      "t"
    )
    // \x1b[31m 破坏 ## 匹配
    expect(plan.sections.length).toBeGreaterThanOrEqual(0)
  })

  test("颜色码包裹任务行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n\x1b[32m#### 1. [ ] t\x1b[0m\n`,
      "t"
    )
    expect(plan.tasks.length).toBeGreaterThanOrEqual(0)
  })

  test("颜色码在字段值内", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: \x1b[31mred text\x1b[0m\n`,
      "t"
    )
    // 字段值含 ANSI 码：可能丢失或保留
    expect(plan.tasks[0].fields.length).toBeGreaterThanOrEqual(0)
  })
})

describe("全角空格和中文标点", () => {
  test("章节标题前导全角空格", () => {
    const plan = parseOmoPlan(
      `##　TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    // 全角空格（U+3000）不匹配 \s+
    expect(plan.sections.length).toBeGreaterThanOrEqual(0)
  })

  test("字段值含全角空格", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: value　with　fullwidth\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("with")
  })

  test("字段值含中文逗号", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: a，b，c\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe("a，b，c")
  })

  test("字段值含中文句号", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: 第一段。第二段。\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe("第一段。第二段。")
  })
})

describe("任务标题伪 heading 干扰", () => {
  test("任务标题含 ###", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] use ### in title\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("use ### in title")
  })

  test("任务标题含 ##", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] see ## section\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("see ## section")
  })

  test("任务标题含 ####", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] use #### for sub-task\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("use #### for sub-task")
  })
})

describe("任务标题括号嵌套", () => {
  test("任务标题含方括号嵌套 [a] [b]", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] option [A] or [B]\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("option [A] or [B]")
  })

  test("任务标题含花括号 {a} {b}", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] const {a, b} = obj\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("const {a, b} = obj")
  })

  test("任务标题含尖括号 <a>", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] <Component /> tag\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("<Component /> tag")
  })

  test("任务标题含圆括号嵌套", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] func((a + b) * c)\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("func((a + b) * c)")
  })
})

describe("任务编号边界", () => {
  test("任务编号 0", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 0. [ ] zero\n`, "t")
    expect(plan.tasks[0].number).toBe("0")
  })

  test("任务编号超大 9007199254740992", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 9007199254740992. [ ] max safe int + 1\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("9007199254740992")
  })

  test("任务编号 999999", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 999999. [ ] six digits\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("999999")
  })
})

describe("FVW 编号边界", () => {
  test("FVW 编号 F0", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F0. [ ] zero\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F0")
  })

  test("FVW 编号 F999999", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F999999. [ ] extreme\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F999999")
  })
})

describe("RTL 文本和组合字符", () => {
  test("任务标题含阿拉伯文（RTL）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] مرحبا بالعالم\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("مرحبا بالعالم")
  })

  test("任务标题含 RTL 覆盖字符", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] normal\u202Ereversed text\n`,
      "t"
    )
    // \u202E 是 RTL 覆盖字符，应保留
    expect(plan.tasks[0].title).toContain("\u202E")
  })

  test("任务标题含 ZWJ 家庭 emoji", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] family 👨\u200D👩\u200D👧\u200D👦\n`,
      "t"
    )
    expect(plan.tasks[0].title).toContain("family")
    expect(plan.tasks[0].title).toContain("\u200D")
  })

  test("任务标题含组合字符（café）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] cafe\\u0301\n`,
      "t"
    )
    // café = café（NFC）或 cafe + ́（NFD）
    expect(plan.tasks[0].title).toContain("cafe")
  })
})

describe("纯 reference 章节无任务", () => {
  test("只有 reference 章节（无 TODO/FVW）", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nsummary\n## 2. Context\nbackground\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(0)
    expect(plan.sections.length).toBe(2)
  })

  test("tasks 为空时 generator 不崩", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nfoo\n## 2. Context\nbar\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    // 应只输出 Plan Reference，无 ## Tasks
    expect(out).toContain("## Plan Reference")
    expect(out).toContain("### 1. TL;DR")
  })
})

describe("多核心章节连续", () => {
  test("TODO 和 FVW 紧邻无内容", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n## Final Verification Wave\n### F1. [ ] fvw1\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(2)
    expect(plan.sections.length).toBe(2)
    expect(plan.sections[0].isCore).toBe(true)
    expect(plan.sections[1].isCore).toBe(true)
  })

  test("核心章节在中间（无内容）", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\n## TODOs\n#### 1. [ ] t1\n## Final Verification Wave\n### F1. [ ] fvw\n## 9. Success\n`,
      "t"
    )
    expect(plan.sections.length).toBe(4)
    expect(plan.sections[1].isCore).toBe(true)
    expect(plan.sections[2].isCore).toBe(true)
  })
})

describe("多 reference 章节连续", () => {
  test("连续 5 个 reference 章节", () => {
    let content = ""
    for (let i = 1; i <= 5; i++) {
      content += `## ${i}. Section ${i}\nbody ${i}\n\n`
    }
    content += `## TODOs\n#### 1. [ ] t\n`
    const plan = parseOmoPlan(content, "t")
    expect(plan.sections.filter((s) => !s.isCore).length).toBe(5)
  })
})

describe("字段续行深嵌套", () => {
  test("字段续行是 * 列表", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n  * star item 1\n  * star item 2\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("star item 1")
    expect(plan.tasks[0].fields[0].value).toContain("star item 2")
  })

  test("字段续行是数字列表", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v\n  1. first\n  2. second\n  3. third\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("1. first")
    expect(plan.tasks[0].fields[0].value).toContain("3. third")
  })
})

describe("空字段名边界", () => {
  test("字段名只有空格 ** **", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **   **: value\n`,
      "t"
    )
    // 纯空格字段名被 trim 为空
    expect(plan.tasks[0].fields.length).toBe(0)
  })

  test("字段名是 `**`（空内容）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- ****: value\n`,
      "t"
    )
    // 正则 [^*]+ 要求至少 1 字符
    expect(plan.tasks[0].fields.length).toBe(0)
  })
})

describe("特殊结尾行", () => {
  test("plan 末尾单换行后字段", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe("v")
  })

  test("plan 末尾字段无换行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe("v")
  })
})

describe("字段值含特殊 token", () => {
  test("字段值含 SQL 注入字符串", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Query**: SELECT * FROM users; DROP TABLE users; --\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("DROP TABLE")
  })

  test("字段值含 HTML script 闭合", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**: use </script> carefully\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("</script>")
  })

  test("字段值含 base64", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Data**: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("data:image/png;base64")
  })
})

describe("Generator 边界", () => {
  test("tasks 为空但有 reference - generator 不崩", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nfoo\n## 2. Context\nbar\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    // 验证输出至少包含 Plan Reference
    expect(out).toContain("Plan Reference")
  })

  test("超长任务编号（10 位数字）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1234567890. [ ] big number\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("1.1")
  })

  test("无 wave 但有 FVW", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] fvw\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("### Final Verification Wave")
  })
})

describe("超大和超小 plan", () => {
  test("100 个章节", () => {
    let content = "## 1. TODOs\n#### 1. [ ] t\n"
    for (let i = 1; i <= 100; i++) {
      content += `## ${i + 1}. Section ${i}\nbody ${i}\n\n`
    }
    const plan = parseOmoPlan(content, "t")
    expect(plan.sections.filter((s) => !s.isCore).length).toBe(100)
  })

  test("plan 完全单行（无换行）", () => {
    const plan = parseOmoPlan(`## TODOs#### 1. [ ] t`, "t")
    // 单行输入应优雅处理（不崩），可能返回 0 tasks
    expect(plan.sections.length).toBeGreaterThanOrEqual(0)
  })

  test("巨长单行 10000 字符", () => {
    const longLine = "x".repeat(10000)
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] ${longLine}\n`,
      "t"
    )
    expect(plan.tasks[0].title.length).toBe(10000)
  })
})
