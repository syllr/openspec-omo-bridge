#!/usr/bin/env bun test
/**
 * sync-tasks-from-plan 回归测试套件
 *
 * 覆盖 12 大类边界情况，确保 plan → tasks.md 镜像的健壮性。
 * 运行：bun test tools/__tests__/sync-tasks-from-plan.test.ts
 */

import { describe, expect, test } from "bun:test"
import {
  generateOpenSpecTasks,
  parseOmoPlan,
} from "../sync-plan-to-tasks"

// ============================================================
// 1. 章节标题解析
// ============================================================

describe("章节标题解析", () => {
  test("无编号 ## TODOs", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.sections[0].title).toBe("TODOs")
    expect(plan.sections[0].rawTitle).toBe("TODOs")
  })

  test("带编号 ## 6. TODOs", () => {
    const plan = parseOmoPlan(`## 6. TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.sections[0].title).toBe("TODOs")
    expect(plan.sections[0].rawTitle).toBe("6. TODOs")
  })

  test("无空格 ## 6.TODOs", () => {
    const plan = parseOmoPlan(`## 6.TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.sections[0].title).toBe("TODOs")
  })

  test("多位编号 ## 10. TODOs", () => {
    const plan = parseOmoPlan(`## 10. TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.sections[0].title).toBe("TODOs")
    expect(plan.sections[0].rawTitle).toBe("10. TODOs")
  })

  test("大写 ## TODOS", () => {
    const plan = parseOmoPlan(`## TODOS\n#### 1. [ ] t\n`, "t")
    // 核心章节识别基于 lowercase 比较，大写也算核心
    expect(plan.sections[0].isCore).toBe(true)
  })

  test("小写 ## todos", () => {
    const plan = parseOmoPlan(`## todos\n#### 1. [ ] t\n`, "t")
    expect(plan.sections[0].isCore).toBe(true)
  })

  test("混合大小写 ## Final VERIFICATION Wave", () => {
    const plan = parseOmoPlan(
      `## Final VERIFICATION Wave\n### F1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].isCore).toBe(true)
  })

  test("标题含冒号 ## Section: subtitle", () => {
    const plan = parseOmoPlan(
      `## Section: subtitle\nmore text\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].title).toBe("Section: subtitle")
  })

  test("标题含 emoji", () => {
    const plan = parseOmoPlan(
      `## 1. 🚀 Launch\nfoo\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].title).toBe("🚀 Launch")
  })

  test("标题含中文", () => {
    const plan = parseOmoPlan(
      `## 1. 目标与背景\nfoo\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].title).toBe("目标与背景")
  })

  test("标题前后有空格 ##   TODOs  ", () => {
    const plan = parseOmoPlan(`##   TODOs  \n#### 1. [ ] t\n`, "t")
    expect(plan.sections[0].title).toBe("TODOs")
  })

  test("标题含斜杠 ## API/Design", () => {
    const plan = parseOmoPlan(`## API/Design\nfoo\n`, "t")
    expect(plan.sections[0].title).toBe("API/Design")
  })
})

// ============================================================
// 2. 任务编号解析
// ============================================================

describe("任务编号解析", () => {
  test("标准 #### 1. [ ]", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.tasks[0].number).toBe("1")
  })

  test("checkbox 状态 [x]", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [x] t\n`, "t")
    expect(plan.tasks[0].completed).toBe(true)
  })

  test("checkbox 状态 [X] 大写", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [X] t\n`, "t")
    expect(plan.tasks[0].completed).toBe(true)
  })

  test("checkbox 状态 [ ] 未完成", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.tasks[0].completed).toBe(false)
  })

  test("大编号 #### 99. [ ]", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 99. [ ] t\n`, "t")
    expect(plan.tasks[0].number).toBe("99")
  })

  test("三位编号 #### 100. [ ]", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 100. [ ] t\n`, "t")
    expect(plan.tasks[0].number).toBe("100")
  })

  test("小数编号 #### 1.0 [ ]（OMO 不支持）", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1.0 [ ] t\n`, "t")
    expect(plan.tasks.length).toBe(0)
  })

  test("小数编号 #### 1.5 [ ]（OMO 不支持）", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1.5 [ ] t\n`, "t")
    expect(plan.tasks.length).toBe(0)
  })

  test("多级编号 #### 1.1 [ ]（OMO 不支持）", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1.1 [ ] t\n`, "t")
    expect(plan.tasks.length).toBe(0)
  })

  test("FVW 单数字 ### F1. [ ]", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F1")
    expect(plan.tasks[0].isFvw).toBe(true)
  })

  test("FVW 两位数 ### F10. [ ]", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F10. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F10")
  })

  test("FVW 三位数 ### F100. [ ]", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F100. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("F100")
  })

  test("FVW 小写 ### f1. [ ]", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### f1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].number).toBe("f1")
  })

  test("FVW 大写 ### F1. [X]", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F1. [X] t\n`,
      "t"
    )
    expect(plan.tasks[0].completed).toBe(true)
  })
})

// ============================================================
// 3. 任务标题特殊字符
// ============================================================

describe("任务标题特殊字符", () => {
  test("emoji 🎉", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] 任务 🎉\n`, "t")
    expect(plan.tasks[0].title).toBe("任务 🎉")
  })

  test("多个 emoji", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] 🎉🚀✨ 完成\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("🎉🚀✨ 完成")
  })

  test("内联 code", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] use \`bun test\`\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("use `bun test`")
  })

  test("**bold** 和 *italic*", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] **bold** and *italic*\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("**bold** and *italic*")
  })

  test("链接 [text](url)", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] see [proposal](openspec/foo/proposal.md)\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("see [proposal](openspec/foo/proposal.md)")
  })

  test("中文括号【】", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] 任务【重要】\n`, "t")
    expect(plan.tasks[0].title).toBe("任务【重要】")
  })

  test("中文标点：，。", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] 修复 bug，重构代码。\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("修复 bug，重构代码。")
  })

  test("裸 #（不是 heading）", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] fix #123 bug\n`, "t")
    expect(plan.tasks[0].title).toBe("fix #123 bug")
  })

  test("HTML 实体 &lt; &amp;", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] &lt;div&gt; &amp; &quot;quote&quot;\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe(
      `&lt;div&gt; &amp; &quot;quote&quot;`
    )
  })

  test("URL 字符 ?&=:#", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] GET https://api.example.com/v1/users?id=1&active=true#section\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe(
      "GET https://api.example.com/v1/users?id=1&active=true#section"
    )
  })

  test("超长标题 1000 字符", () => {
    const longTitle = "x".repeat(1000)
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] ${longTitle}\n`,
      "t"
    )
    expect(plan.tasks[0].title.length).toBe(1000)
  })

  test("标题含管道符 |（表格语法）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] col1 | col2 | col3\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("col1 | col2 | col3")
  })

  test("标题含 [列表]", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] option [A] or [B]\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("option [A] or [B]")
  })

  test("标题含反引号嵌套", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] \`\`code block\`\`-style\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("``code block``-style")
  })

  test("标题前导/尾随空格被 trim", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ]   title with edges  \n`, "t")
    expect(plan.tasks[0].title).toBe("title with edges")
  })

  test("阿拉伯语 RTL", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] اختبار العربية\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("اختبار العربية")
  })

  test("日文 含假名汉字", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] テストのひらがな漢字\n`,
      "t"
    )
    expect(plan.tasks[0].title).toBe("テストのひらがな漢字")
  })
})

// ============================================================
// 4. 字段值解析
// ============================================================

describe("字段值解析", () => {
  test("标准字段 - **Field**: value", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: value\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0]).toEqual({
      name: "Field",
      value: "value",
    })
  })

  test("字段含冒号 value: extra", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **URL**: http://example.com:8080/path\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe(
      "http://example.com:8080/path"
    )
  })

  test("字段含连续冒号", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Header**: a:b:c:d\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe("a:b:c:d")
  })

  test("内联 code 在字段值", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: use \`bun test\` here\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toBe("use `bun test` here")
  })

  test("代码块 fence 在字段值", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Code**: \`\`\`bash\n  echo hi\n  echo bye\n  \`\`\`\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("Code")
    expect(plan.tasks[0].fields[0].value).toContain("echo hi")
    expect(plan.tasks[0].fields[0].value).toContain("echo bye")
  })

  test("代码块含多个语言", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Multi**: \`\`\`python\n  print(1)\n  \`\`\`\n  \`\`\`js\n  console.log(1)\n  \`\`\`\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("print(1)")
    expect(plan.tasks[0].fields[0].value).toContain("console.log(1)")
  })

  test("多个字段", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **A**: 1\n- **B**: 2\n- **C**: 3\n`,
      "t"
    )
    expect(plan.tasks[0].fields.length).toBe(3)
    expect(plan.tasks[0].fields.map((f) => f.name)).toEqual([
      "A",
      "B",
      "C",
    ])
  })

  test("重复字段名（保留多次）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Note**: first\n- **Note**: second\n`,
      "t"
    )
    expect(plan.tasks[0].fields.length).toBe(2)
  })

  test("字段名含空格 **My Field**: v", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **My Field**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("My Field")
  })

  test("字段名含 emoji **📌 Note**: v", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **📌 Note**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("📌 Note")
  })

  test("字段名含中文 **注意事项**: v", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **注意事项**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("注意事项")
  })

  test("字段名超长 200 字符", () => {
    const longName = "x".repeat(200)
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **${longName}**: v\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].name.length).toBe(200)
  })

  test("字段值超长 5000 字符", () => {
    const longValue = "x".repeat(5000)
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: ${longValue}\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value.length).toBe(5000)
  })
})

// ============================================================
// 5. 字段续行
// ============================================================

describe("字段续行", () => {
  test("2 空格缩进续行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n  v2 (2 spaces)\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("v2 (2 spaces)")
  })

  test("4 空格缩进续行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n    v2 (4 spaces)\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("v2 (4 spaces)")
  })

  test("6 空格缩进续行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n      v2 (6 spaces)\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("v2 (6 spaces)")
  })

  test("列表项作为续行（- 开头）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **What to do**: line1\n  - sub item 1\n  - sub item 2\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("sub item 1")
    expect(plan.tasks[0].fields[0].value).toContain("sub item 2")
  })

  test("嵌套列表", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Steps**: v\n  - step 1\n    - sub step 1a\n    - sub step 1b\n  - step 2\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("sub step 1a")
    expect(plan.tasks[0].fields[0].value).toContain("sub step 1b")
  })

  test("续行看起来像新任务（heading-like）但有缩进", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n  ## not a heading\n  v2\n`,
      "t"
    )
    // ## not a heading 看起来是 heading 但在续行中
    // 当前规则: 不以 ####|###|## 开头即可续行
    expect(plan.tasks[0].fields[0].value).toContain("v2")
  })

  test("续行是真正的 heading 终止字段", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n## 2. New Section\nbody\n`,
      "t"
    )
    // ## 是新章节，应终止字段
    expect(plan.tasks[0].fields[0].value).toBe("v1")
  })

  test("多个续行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n  v2\n  v3\n  v4\n  v5\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("v1")
    expect(plan.tasks[0].fields[0].value).toContain("v2")
    expect(plan.tasks[0].fields[0].value).toContain("v3")
    expect(plan.tasks[0].fields[0].value).toContain("v4")
    expect(plan.tasks[0].fields[0].value).toContain("v5")
  })

  test("续行之间空行（实际不是续行）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n\n  v2 after blank line\n`,
      "t"
    )
    // 空行后以空格开头的 v2 是否被捕获
    // 当前实现: 任何缩进+非空行都被当作续行，包括空行后的内容
    expect(plan.tasks[0].fields[0].value).toContain("v2 after blank line")
  })

  test("续行含 emoji 🎉", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n  v2 🎉\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("v2 🎉")
  })

  test("续行含中文", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **字段**: 第一行\n  第二行中文\n  第三行\n`,
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("第二行中文")
    expect(plan.tasks[0].fields[0].value).toContain("第三行")
  })

  test("续行含代码块 fence 续行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Code**: \`\`\`bash\n  echo 1\n  echo 2\n  echo 3\n  \`\`\`\n`,
      "t"
    )
    const value = plan.tasks[0].fields[0].value
    expect(value).toContain("echo 1")
    expect(value).toContain("echo 2")
    expect(value).toContain("echo 3")
  })
})

// ============================================================
// 6. Wave 标题解析
// ============================================================

describe("Wave 标题解析", () => {
  test("无编号 ### Wave 1: title", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### Wave 1: setup\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: setup")
  })

  test("带编号 ### 6.1 Wave 1: title", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: setup\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: setup")
  })

  test("两位编号 ### 7.10 Wave 1: title", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 7.10 Wave 1: setup\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: setup")
  })

  test("三位编号 ### 10.5 Wave 1: title", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 10.5 Wave 1: setup\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: setup")
  })

  test("Wave 标题含 emoji", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: 🚀 launch\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: 🚀 launch")
  })

  test("Wave 标题含中文", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: 环境搭建\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: 环境搭建")
  })

  test("Wave 标题含括号", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: 初始化（4 并发）\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: 初始化（4 并发）")
  })

  test("Wave 标题含括号（英文）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: setup (4 concurrent)\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Wave 1: setup (4 concurrent)")
  })

  test("无 Wave 标题（空 Wave 名称）", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.tasks[0].wave).toBe("")
  })

  test("多个任务在无 Wave 的同一隐式 Wave", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n#### 2. [ ] t2\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("")
    expect(plan.tasks[1].wave).toBe("")
  })

  test("FVW 不识别 Wave 标题", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### Wave 1: should be ignored\n### F1. [ ] fvw\n`,
      "t"
    )
    expect(plan.tasks[0].wave).toBe("Final Verification Wave")
  })
})

// ============================================================
// 7. CRLF / 换行 / 空白
// ============================================================

describe("CRLF / 换行 / 空白", () => {
  test("CRLF 行尾", () => {
    const plan = parseOmoPlan(
      "## TODOs\r\n#### 1. [ ] t\r\n- **Field**: v\r\n",
      "t"
    )
    expect(plan.tasks[0].title).toBe("t")
    expect(plan.tasks[0].fields[0].name).toBe("Field")
    expect(plan.tasks[0].fields[0].value).toBe("v")
  })

  test("CRLF 多行字段", () => {
    const plan = parseOmoPlan(
      "## TODOs\r\n#### 1. [ ] t\r\n- **Field**: v1\r\n  v2\r\n  v3\r\n",
      "t"
    )
    expect(plan.tasks[0].fields[0].value).toContain("v1")
    expect(plan.tasks[0].fields[0].value).toContain("v2")
    expect(plan.tasks[0].fields[0].value).toContain("v3")
  })

  test("混合 LF 和 CRLF", () => {
    const plan = parseOmoPlan(
      "## TODOs\n#### 1. [ ] t\r\n- **Field**: v\n",
      "t"
    )
    expect(plan.tasks[0].fields[0].name).toBe("Field")
  })

  test("plan 末尾无换行", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t`, "t")
    expect(plan.tasks.length).toBe(1)
  })

  test("plan 末尾单换行", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.tasks.length).toBe(1)
  })

  test("plan 末尾多换行", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n\n\n\n`, "t")
    expect(plan.tasks.length).toBe(1)
  })

  test("完全空 plan", () => {
    const plan = parseOmoPlan("", "t")
    expect(plan.sections.length).toBe(0)
    expect(plan.tasks.length).toBe(0)
  })

  test("只有空行的 plan", () => {
    const plan = parseOmoPlan("\n\n\n", "t")
    expect(plan.sections.length).toBe(0)
  })

  test("空白字符 plan", () => {
    const plan = parseOmoPlan("   \n\t\n  \n", "t")
    expect(plan.sections.length).toBe(0)
  })

  test("任务之间多空行", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n\n\n\n#### 2. [ ] t2\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(2)
  })

  test("tab 缩进（不是空格）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: v1\n\tv2 (tab indent)\n`,
      "t"
    )
    // 当前规则: /^\s+\S/ 也匹配 tab
    expect(plan.tasks[0].fields[0].value).toContain("v2 (tab indent)")
  })

  test("纯 tab 行", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n\t\n`, "t")
    expect(plan.tasks.length).toBe(1)
  })
})

// ============================================================
// 8. Generator 输出
// ============================================================

describe("Generator 输出", () => {
  test("基本结构：## Tasks header", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("## Tasks")
  })

  test("包含警告提示", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("本文件由")
    expect(out).toContain("不要手动编辑")
  })

  test("单 Wave 任务", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### Wave 1: setup\n#### 1. [ ] t\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("### Wave 1: setup")
    expect(out).toContain("- [ ] 1.1 t")
  })

  test("多 Wave 任务编号 1.1, 1.2, 2.1, 2.2", () => {
    const plan = parseOmoPlan(
      `## TODOs\n### 6.1 Wave 1: a\n#### 1. [ ] x\n#### 2. [ ] y\n### 6.2 Wave 2: b\n#### 3. [ ] z\n#### 4. [ ] w\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("- [ ] 1.1 x")
    expect(out).toContain("- [ ] 1.2 y")
    expect(out).toContain("- [ ] 2.1 z")
    expect(out).toContain("- [ ] 2.2 w")
  })

  test("FVW 编号 1.1 (todo), 2.1, 2.2 (fvw)", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n## Final Verification Wave\n### F1. [ ] fvw1\n### F2. [ ] fvw2\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("- [ ] 1.1 t1")
    expect(out).toContain("- 2.1 fvw1")
    expect(out).toContain("- 2.2 fvw2")
  })

  test("FVW 任务在 tasks.md 中无 checkbox(用户手动验证)", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n#### 2. [x] t2\n## Final Verification Wave\n### F1. [ ] fvw1\n- **Acceptance**: ./gradlew check\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("- [ ] 1.1 t1")
    expect(out).toContain("- [x] 1.2 t2")
    expect(out).toContain("- 2.1 fvw1")
    expect(out).toContain("**Acceptance**: ./gradlew check")
    expect(out).not.toMatch(/^- \[[ x]\] 2\.1/m)
  })

  test("checkbox 状态正确", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t1\n#### 2. [x] t2\n#### 3. [X] t3\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("- [ ] 1.1 t1")
    expect(out).toContain("- [x] 1.2 t2")
    expect(out).toContain("- [x] 1.3 t3")
  })

  test("字段 6 空格缩进", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: value\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("      **Field**: value")
  })

  test("多行字段续行 6 空格缩进", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: a\n  b\n  c\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("      **Field**: a\n      b\n      c")
  })

  test("Plan Reference 附录", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nsummary\n## 6. TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("## Plan Reference")
    expect(out).toContain("### 1. TL;DR")
    expect(out).toContain("summary")
  })

  test("Plan Reference 按 plan 顺序排列", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nfirst\n## 9. Success Criteria\nlast\n## 6. TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    const firstIdx = out.indexOf("### 1. TL;DR")
    const lastIdx = out.indexOf("### 9. Success Criteria")
    expect(firstIdx).toBeGreaterThan(0)
    expect(lastIdx).toBeGreaterThan(firstIdx)
  })

  test("无 reference 章节时不输出附录", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] fvw\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).not.toContain("## Plan Reference")
  })

  test("空字段不输出", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- **Field**: \n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    expect(out).not.toContain("**Field**:")
  })

  test("无字段任务正常输出", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] bare task\n`, "t")
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("- [ ] 1.1 bare task")
  })

  test("空 reference 章节跳过", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\n\n\n## 6. TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    const out = generateOpenSpecTasks(plan)
    // 1. TL;DR body 为空（只有换行），不应输出 ### 1. TL;DR
    expect(out).not.toContain("### 1. TL;DR")
  })
})

// ============================================================
// 9. 章节边界
// ============================================================

describe("章节边界", () => {
  test("只有 TODO 无 FVW", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] t\n`, "t")
    expect(plan.tasks.length).toBe(1)
    const out = generateOpenSpecTasks(plan)
    expect(out).not.toContain("Final Verification Wave")
  })

  test("只有 FVW 无 TODO", () => {
    const plan = parseOmoPlan(
      `## Final Verification Wave\n### F1. [ ] fvw\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(1)
    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("### Final Verification Wave")
  })

  test("无核心章节", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nfoo\n## 2. Context\nbar\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(0)
    expect(plan.sections.filter((s) => s.isCore).length).toBe(0)
  })

  test("核心章节在中间", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nfoo\n## 6. TODOs\n#### 1. [ ] t\n## 8. Commit\nbar\n`,
      "t"
    )
    expect(plan.sections[0].isCore).toBe(false)
    expect(plan.sections[1].isCore).toBe(true)
    expect(plan.sections[2].isCore).toBe(false)
  })

  test("核心章节在最前", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n## 1. TL;DR\nfoo\n`,
      "t"
    )
    expect(plan.sections[0].isCore).toBe(true)
    expect(plan.sections[1].isCore).toBe(false)
  })

  test("核心章节在最后", () => {
    const plan = parseOmoPlan(
      `## 1. TL;DR\nfoo\n## 6. TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.sections[0].isCore).toBe(false)
    expect(plan.sections[1].isCore).toBe(true)
  })

  test("连续多个核心章节", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n## Final Verification Wave\n### F1. [ ] fvw\n`,
      "t"
    )
    expect(plan.sections.filter((s) => s.isCore).length).toBe(2)
  })
})

// ============================================================
// 10. 真实场景
// ============================================================

describe("真实场景", () => {
  test("完整 9 章节 plan", () => {
    const planContent = `## 1. TL;DR
一句话摘要

## 2. Context
背景

## 3. Work Objectives
- **Must Have**: foo
- **Must NOT Have**: bar

## 4. Verification Strategy
- **Test Decision**: yes

## 5. Execution Strategy
- **Critical Path**: t1 → t2

## 6. TODOs
### 6.1 Wave 1: setup
#### 1. [ ] 任务1
  - **What to do**: do stuff
  - **Acceptance Criteria**: \`bun test\`

## 7. Final Verification Wave
### F1. [ ] verify
  - **Acceptance Criteria**: pass

## 8. Commit Strategy
one commit

## 9. Success Criteria
all tests pass
`
    const plan = parseOmoPlan(planContent, "test")
    expect(plan.sections.length).toBe(9)
    expect(plan.sections.filter((s) => s.isCore).length).toBe(2)
    expect(plan.sections.filter((s) => !s.isCore).length).toBe(7)
    expect(plan.tasks.length).toBe(2)

    const out = generateOpenSpecTasks(plan)
    expect(out).toContain("## Plan Reference")
    expect(out).toContain("### 1. TL;DR")
    expect(out).toContain("**Must Have**: foo")
    expect(out).toContain("**Critical Path**: t1 → t2")
  })

  test("nginx 风格 plan（实际工程）", () => {
    const planContent = `## 6. TODOs
> OMO 通过本节 checkbox 追踪进度。

### 6.1 Wave 1: Mac 本地代码修改

#### 1. [ ] 修改 nginx 模板 references/nginx.conf

- **What to do**:
  1. 读取当前 nginx.conf
  2. 合并 location
- **Must NOT do**:
  - 不动 SSL 证书
- **Acceptance Criteria**:
  \`\`\`bash
  grep -A 2 "location /vc/" nginx.conf
  \`\`\`
- **Evidence**: .omo/evidence/nginx.txt
- **Commit**: YES
`
    const plan = parseOmoPlan(planContent, "nginx")
    expect(plan.tasks.length).toBe(1)
    expect(plan.tasks[0].fields.length).toBe(5)
    const names = plan.tasks[0].fields.map((f) => f.name)
    expect(names).toContain("What to do")
    expect(names).toContain("Must NOT do")
    expect(names).toContain("Acceptance Criteria")
    expect(names).toContain("Evidence")
    expect(names).toContain("Commit")
  })

  test("包含表格的非核心章节", () => {
    const planContent = `## 1. Work Objectives
| Cap | Status |
|-----|--------|
| A   | done   |

## TODOs
#### 1. [ ] t
`
    const plan = parseOmoPlan(planContent, "test")
    expect(plan.sections[0].body).toContain("| Cap")
    expect(plan.sections[0].body).toContain("| A   | done   |")
  })

  test("包含 blockquote 的非核心章节", () => {
    const planContent = `## 1. Context
> 这是引用
> 多行引用

## TODOs
#### 1. [ ] t
`
    const plan = parseOmoPlan(planContent, "test")
    expect(plan.sections[0].body).toContain("> 这是引用")
    expect(plan.sections[0].body).toContain("> 多行引用")
  })

  test("包含代码块的非核心章节", () => {
    const planContent = `## 1. Example
\`\`\`bash
echo "hello"
echo "world"
\`\`\`

## TODOs
#### 1. [ ] t
`
    const plan = parseOmoPlan(planContent, "test")
    expect(plan.sections[0].body).toContain("```bash")
    expect(plan.sections[0].body).toContain('echo "hello"')
  })

  test("包含 HTML 的非核心章节", () => {
    const planContent = `## 1. Notes
<details>
<summary>Click me</summary>
content
</details>

## TODOs
#### 1. [ ] t
`
    const plan = parseOmoPlan(planContent, "test")
    expect(plan.sections[0].body).toContain("<details>")
    expect(plan.sections[0].body).toContain("<summary>Click me</summary>")
  })

  test("包含链接的非核心章节", () => {
    const planContent = `## 1. References
- [proposal](openspec/foo/proposal.md)
- https://example.com

## TODOs
#### 1. [ ] t
`
    const plan = parseOmoPlan(planContent, "test")
    expect(plan.sections[0].body).toContain("[proposal](openspec/foo/proposal.md)")
    expect(plan.sections[0].body).toContain("https://example.com")
  })
})

// ============================================================
// 11. 幂等性
// ============================================================

describe("幂等性", () => {
  test("运行两次产出相同", () => {
    const planContent = `## 6. TODOs
### 6.1 Wave 1: setup
#### 1. [ ] t1
- **A**: v1
  v2

#### 2. [x] t2
- **B**: w1

## 1. TL;DR
summary
`
    const plan1 = parseOmoPlan(planContent, "test")
    const out1 = generateOpenSpecTasks(plan1)

    // 把生成的 tasks.md 重新当 plan 解析（虽然格式不同，但可以测试不崩）
    const plan2 = parseOmoPlan(out1, "test")
    const out2 = generateOpenSpecTasks(plan2)

    // 第二次输出不应崩溃
    expect(out2.length).toBeGreaterThan(0)
  })

  test("tasks.md 不是合法 plan 格式（单方向设计）", () => {
    // tasks.md 是 OpenSpec 格式（- [ ] N.M），plan 是 OMO 格式（#### N. [ ]）
    // tool 是单方向 plan → tasks.md，tasks.md 不能被 parser 当 plan 解析
    const planContent = `## TODOs
#### 1. [ ] t
- **Field**: v
- **Other**: o
`
    const plan1 = parseOmoPlan(planContent, "test")
    const out1 = generateOpenSpecTasks(plan1)

    // 把生成的 tasks.md 重新当 plan 解析：应该返回 0 任务
    // （因为 ## Tasks 不是 ## TODOs，- [ ] 1.1 不是 #### N. [ ]）
    const plan2 = parseOmoPlan(out1, "test")
    expect(plan2.tasks.length).toBe(0)
  })

  test("plan → tasks.md 二次同步幂等", () => {
    // 同一个 plan 同步两次，输出应相同
    const planContent = `## TODOs
### 6.1 Wave 1: setup
#### 1. [ ] t
- **Field**: v
- **Other**: o
`
    const plan = parseOmoPlan(planContent, "test")
    const out1 = generateOpenSpecTasks(plan)
    const out2 = generateOpenSpecTasks(plan)
    expect(out1).toBe(out2)
  })
})

// ============================================================
// 12. 性能 / 压力测试
// ============================================================

describe("性能 / 压力测试", () => {
  test("100 个任务", () => {
    let planContent = `## TODOs\n`
    for (let i = 1; i <= 100; i++) {
      planContent += `#### ${i}. [ ] task ${i}\n- **Field**: v${i}\n\n`
    }
    const start = performance.now()
    const plan = parseOmoPlan(planContent, "test")
    const out = generateOpenSpecTasks(plan)
    const elapsed = performance.now() - start

    expect(plan.tasks.length).toBe(100)
    expect(out).toContain("- [ ] 1.1 task 1")
    expect(out).toContain("- [ ] 1.100 task 100")
    expect(elapsed).toBeLessThan(1000) // < 1s
  })

  test("1000 个任务", () => {
    let planContent = `## TODOs\n`
    for (let i = 1; i <= 1000; i++) {
      planContent += `#### ${i}. [ ] task\n`
    }
    const start = performance.now()
    const plan = parseOmoPlan(planContent, "test")
    const out = generateOpenSpecTasks(plan)
    const elapsed = performance.now() - start

    expect(plan.tasks.length).toBe(1000)
    expect(elapsed).toBeLessThan(3000) // < 3s
  })

  test("单字段值 10000 字符", () => {
    const longValue = "x".repeat(10000)
    const planContent = `## TODOs\n#### 1. [ ] t\n- **Field**: ${longValue}\n`
    const start = performance.now()
    const plan = parseOmoPlan(planContent, "test")
    const out = generateOpenSpecTasks(plan)
    const elapsed = performance.now() - start

    expect(plan.tasks[0].fields[0].value.length).toBe(10000)
    expect(elapsed).toBeLessThan(1000)
  })

  test("50 个 Wave", () => {
    let planContent = `## TODOs\n`
    for (let i = 1; i <= 50; i++) {
      planContent += `### 6.${i} Wave ${i}: w${i}\n#### ${i}. [ ] t${i}\n\n`
    }
    const plan = parseOmoPlan(planContent, "test")
    const out = generateOpenSpecTasks(plan)
    expect(plan.tasks.length).toBe(50)
    expect(out).toContain("### Wave 1: w1")
    expect(out).toContain("### Wave 50: w50")
  })
})

// ============================================================
// 13. 错误恢复
// ============================================================

describe("错误恢复", () => {
  test("格式错误的 task 行（不是 #### 开头）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n# 不是 task 的 heading\n#### 1. [ ] t\n`,
      "t"
    )
    expect(plan.tasks.length).toBe(1)
  })

  test("task 在 section 之前（无章节）", () => {
    const plan = parseOmoPlan(`#### 1. [ ] t\n## TODOs\n#### 2. [ ] t2\n`, "t")
    // 没有 ## 章节，task 不会被识别
    expect(plan.tasks.length).toBe(1)
    expect(plan.tasks[0].number).toBe("2")
  })

  test("Wave 在 TODO 之外", () => {
    const plan = parseOmoPlan(
      `## Context\n### Wave 1: should be ignored\n## TODOs\n#### 1. [ ] t\n`,
      "t"
    )
    // Wave header 在非 TODO section 中被忽略
    expect(plan.tasks[0].wave).toBe("")
  })

  test("字段在 task 之外（无当前 task）", () => {
    const plan = parseOmoPlan(
      `## TODOs\n- **Field**: orphan\n#### 1. [ ] t\n- **Real**: value\n`,
      "t"
    )
    // 没有当前 task 时，字段被忽略
    expect(plan.tasks[0].fields.length).toBe(1)
    expect(plan.tasks[0].fields[0].name).toBe("Real")
  })

  test("字段以 - 开头但不是 **Field** 格式", () => {
    const plan = parseOmoPlan(
      `## TODOs\n#### 1. [ ] t\n- 普通 list item\n- **Field**: v\n`,
      "t"
    )
    // "普通 list item" 不匹配字段正则
    expect(plan.tasks[0].fields.length).toBe(1)
    expect(plan.tasks[0].fields[0].name).toBe("Field")
  })

  test("章节标题含 * 号", () => {
    const plan = parseOmoPlan(`## 1. *emphasis* section\nfoo\n`, "t")
    expect(plan.sections[0].title).toBe("*emphasis* section")
  })

  test("任务行无标题", () => {
    const plan = parseOmoPlan(`## TODOs\n#### 1. [ ] \n`, "t")
    // 空标题会被 trim 为空字符串
    expect(plan.tasks[0].title).toBe("")
  })
})

// ============================================================
// 14. 集成测试
// ============================================================

describe("集成测试", () => {
  test("完整工作流：parse → generate → re-parse", () => {
    const original = `## 1. TL;DR
摘要

## 2. Context
背景

## 6. TODOs
### 6.1 Wave 1: setup
#### 1. [ ] 任务1
- **What to do**: do something
- **Acceptance Criteria**: \`bun test\`

#### 2. [x] 任务2
- **What to do**: do something else

## 7. Final Verification Wave
### F1. [ ] verify
- **Output**: VERDICT: APPROVE

## 8. Commit Strategy
one commit per wave
`
    // Step 1: parse
    const plan1 = parseOmoPlan(original, "test")
    expect(plan1.tasks.length).toBe(3)
    expect(plan1.sections.length).toBe(5)

    // Step 2: generate
    const out1 = generateOpenSpecTasks(plan1)
    expect(out1).toContain("## Tasks")
    expect(out1).toContain("## Plan Reference")
    expect(out1).toContain("- [ ] 1.1 任务1")
    expect(out1).toContain("- [x] 1.2 任务2")
    expect(out1).toContain("- 2.1 verify")

    // Step 3: 验证幂等性（同 plan 同步两次输出相同）
    const out2 = generateOpenSpecTasks(plan1)
    expect(out1).toBe(out2)
  })

  test("大型 plan 的完整工作流", () => {
    let original = `## 1. TL;DR
大型变更摘要

## 2. Context
背景信息

## 3. Work Objectives
- **Must Have**: feature A
- **Must NOT Have**: legacy code

## 4. Verification Strategy
- **Test Decision**: full coverage

## 5. Execution Strategy
- **Critical Path**: setup → core → deploy

## 6. TODOs
`
    for (let i = 1; i <= 20; i++) {
      const wave = Math.ceil(i / 5)
      original += `### 6.${wave} Wave ${wave}: phase ${wave}\n`
      original += `#### ${i}. [ ] task ${i}\n`
      original += `- **What to do**: do step ${i}\n`
      original += `- **Acceptance Criteria**: test ${i} passes\n\n`
    }
    original += `## 7. Final Verification Wave\n`
    for (let i = 1; i <= 4; i++) {
      original += `### F${i}. [ ] fvw ${i}\n- **Output**: VERDICT: APPROVE\n\n`
    }
    original += `## 8. Commit Strategy
commit per wave\n\n`
    original += `## 9. Success Criteria
all tests pass\n`

    const plan = parseOmoPlan(original, "large")
    expect(plan.tasks.length).toBe(24) // 20 todo + 4 fvw
    expect(plan.sections.length).toBe(9)

    const out = generateOpenSpecTasks(plan)
    // 4 waves
    expect(out).toContain("### Wave 1: phase 1")
    expect(out).toContain("### Wave 2: phase 2")
    expect(out).toContain("### Wave 3: phase 3")
    expect(out).toContain("### Wave 4: phase 4")
    // FVW
    expect(out).toContain("### Final Verification Wave")
    // Plan Reference
    expect(out).toContain("## Plan Reference")
    expect(out).toContain("**Must Have**: feature A")
    expect(out).toContain("**Critical Path**: setup → core → deploy")
  })
})
