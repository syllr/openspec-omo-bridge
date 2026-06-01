/**
 * omo-spec — OpenCode tools
 *
 * 单一文件设计：所有 OMO 相关的 OpenCode tool + 纯逻辑都在此文件。
 * 工具命名（OpenCode 约定）：`omo_spec_<exportname>`
 *   - sync_tasks_from_plan → omo_spec_sync_tasks_from_plan
 *   - validate_omo_plan   → omo_spec_validate_omo_plan
 *
 * 测试通过 `import { parseOmoPlan, generateOpenSpecTasks, validateOmoPlan } from "../omo-spec"` 复用纯函数。
 *
 * Plugin 懒加载：require("@opencode-ai/plugin") + try/catch：
 * - 生产（OpenCode 加载 tool）：plugin 存在，用真实实现
 * - 测试（bridge 本地 bun test）：无 plugin，chainable stub 兜底
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

// 懒加载 plugin：生产用真实实现，测试用 chainable stub
// `tool` 是可调用对象（用于 `tool(config)` 包裹 tool 定义）
// 同时 `tool.schema` 是 chainable schema builder（用于 `tool.schema.string().describe()`）
type ToolFactory = { (config: any): any; schema: any }
let tool: ToolFactory
try {
  // @ts-ignore - require 在 Bun/Node ESM 中可用
  const plugin = require("@opencode-ai/plugin") as { tool: ToolFactory }
  tool = plugin.tool
} catch {
  // 测试环境 fallback：chainable schema + 透传 config
  const chainable: any = () => chainable
  chainable.string = () => chainable
  chainable.number = () => chainable
  chainable.boolean = () => chainable
  chainable.array = () => chainable
  chainable.object = () => chainable
  chainable.describe = () => chainable
  chainable.optional = () => chainable
  const stub = ((config: any) => config) as ToolFactory
  stub.schema = new Proxy({}, { get: () => () => chainable })
  tool = stub
}

// ============================================================
// 纯逻辑层（可单测，零 OpenCode 依赖）
// ============================================================

export interface OmoTaskField {
  name: string
  value: string
}

export interface OmoTask {
  number: string
  title: string
  completed: boolean
  wave: string
  isFvw: boolean
  fields: OmoTaskField[]
}

export interface OmoSection {
  title: string
  rawTitle: string
  body: string
  isCore: boolean
}

export interface OmoPlan {
  changeName: string
  sections: OmoSection[]
  tasks: OmoTask[]
}

export interface OmoPlanCheck {
  name: string
  description: string
  passed: boolean
}

export interface OmoPlanValidation {
  valid: boolean
  totalChecks: number
  passedChecks: number
  results: OmoPlanCheck[]
}

const CORE_SECTION_TITLES = ["TODOs", "Final Verification Wave"] as const

function isCoreSection(title: string): boolean {
  return CORE_SECTION_TITLES.some(
    (core) => title.toLowerCase() === core.toLowerCase()
  )
}

function stripSectionNumber(rawTitle: string): string {
  return rawTitle.replace(/^\d+\.?\s*/, "").trim()
}

export function parseOmoPlan(content: string, changeName: string): OmoPlan {
  const lines = content.split(/\r?\n/)
  const sections: OmoSection[] = []
  const tasks: OmoTask[] = []

  let currentSection: OmoSection | null = null
  let currentWave = ""
  let currentTask: OmoTask | null = null
  let currentField: OmoTaskField | null = null
  let currentIsCore = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const sectionMatch = line.match(/^##\s+(.+)$/)
    if (sectionMatch) {
      if (currentSection) sections.push(currentSection)
      const rawTitle = sectionMatch[1].trim()
      const title = stripSectionNumber(rawTitle)
      currentIsCore = isCoreSection(title)
      currentSection = { title, rawTitle, body: "", isCore: currentIsCore }
      currentTask = null
      currentField = null
      currentWave = ""
      continue
    }

    if (!currentSection) continue

    if (!currentIsCore) {
      currentSection.body += line + "\n"
      continue
    }

    const waveMatch = line.match(
      /^###\s+(?:\d+\.\d+\s+)?Wave\s+(\d+):\s*(.*)$/
    )
    if (waveMatch && currentSection.title.toLowerCase() === "todos") {
      currentWave = `Wave ${waveMatch[1]}: ${waveMatch[2].trim()}`.trim()
      currentTask = null
      currentField = null
      continue
    }

    const fvwTaskMatch = line.match(
      /^###\s+([fF]\d+)\.\s*\[\s*([ xX])\s*\]\s*(.+)$/
    )
    if (
      currentSection.title.toLowerCase() === "final verification wave" &&
      fvwTaskMatch
    ) {
      currentTask = {
        number: fvwTaskMatch[1],
        title: fvwTaskMatch[3].trim(),
        completed:
          fvwTaskMatch[2].toLowerCase() === "x" &&
          fvwTaskMatch[2].trim() !== "",
        wave: "Final Verification Wave",
        isFvw: true,
        fields: [],
      }
      tasks.push(currentTask)
      currentField = null
      continue
    }

    const todoTaskMatch = line.match(
      /^####\s+(\d+(?:\.\d+)?)\.\s*\[\s*([ xX])\s*\]\s*(.+)$/
    )
    if (currentSection.title.toLowerCase() === "todos" && todoTaskMatch) {
      const completed =
        todoTaskMatch[2].toLowerCase() === "x" &&
        todoTaskMatch[2].trim() !== ""
      currentTask = {
        number: todoTaskMatch[1],
        title: todoTaskMatch[3].trim(),
        completed,
        wave: currentWave,
        isFvw: false,
        fields: [],
      }
      tasks.push(currentTask)
      currentField = null
      continue
    }

    const fieldMatch = line.match(/^-\s+\*\*([^*]+)\*\*:\s*(.*)$/)
    if (currentTask && fieldMatch) {
      const fieldName = fieldMatch[1].trim()
      // 过滤空名字段（如 `**   **:` 或 `****:`）——这是无效字段
      if (fieldName === "") {
        currentField = null
        continue
      }
      currentField = {
        name: fieldName,
        value: fieldMatch[2],
      }
      currentTask.fields.push(currentField)
      continue
    }

    if (
      currentField &&
      /^\s+\S/.test(line) &&
      !/^####|###|##/.test(line)
    ) {
      currentField.value += "\n" + line.trim()
      continue
    }

    currentSection.body += line + "\n"
  }

  if (currentSection) sections.push(currentSection)

  return { changeName, sections, tasks }
}

export function generateOpenSpecTasks(plan: OmoPlan): string {
  const lines: string[] = []

  lines.push("## Tasks")
  lines.push("")
  lines.push("> 本文件由 `.omo/plans/<change-name>.md` 镜像生成。")
  lines.push("> 修改 plan 后重新运行同步 tool 即可更新。")
  lines.push("> **不要手动编辑**——下次同步会被覆盖。")
  lines.push("")
  lines.push("---")
  lines.push("")

  const waveGroups = new Map<string, OmoTask[]>()
  for (const task of plan.tasks) {
    if (!waveGroups.has(task.wave)) waveGroups.set(task.wave, [])
    waveGroups.get(task.wave)!.push(task)
  }

  let waveIndex = 0
  for (const [wave, tasks] of waveGroups) {
    waveIndex++
    lines.push(`### ${wave}`)
    lines.push("")

    let subCounter = 0
    for (const task of tasks) {
      subCounter++
      const taskNumber = `${waveIndex}.${subCounter}`
      const checkbox = task.completed ? "[x]" : "[ ]"

      lines.push(`- ${checkbox} ${taskNumber} ${task.title}`)
      lines.push("")

      for (const field of task.fields) {
        const fieldValue = field.value.trim()
        if (fieldValue) {
          const indentedValue = fieldValue
            .split(/\r?\n/)
            .map((line, idx) => (idx === 0 ? line : `      ${line}`))
            .join("\n")
          lines.push(`      **${field.name}**: ${indentedValue}`)
          lines.push("")
        }
      }
    }
  }

  const referenceSections = plan.sections.filter((s) => !s.isCore)
  if (referenceSections.length > 0) {
    lines.push("---")
    lines.push("")
    lines.push("## Plan Reference")
    lines.push("")
    lines.push(
      "> 以下章节从 OMO plan 镜像，仅供人类阅读。OpenSpec CLI 不解析这些字段。"
    )
    lines.push("")

    for (const section of referenceSections) {
      if (!section.body.trim()) continue

      lines.push(`### ${section.rawTitle}`)
      lines.push("")
      lines.push(section.body.trimEnd())
      lines.push("")
    }
  }

  return lines.join("\n")
}

/**
 * 验证 OMO plan 结构是否符合 OMO 兼容性要求。
 * 7 项检查：5 个核心 section 存在 + 2 个任务格式。
 */
export function validateOmoPlan(
  content: string,
  changeName: string
): OmoPlanValidation {
  const results: OmoPlanCheck[] = []

  // 1-5. Section 存在性检查
  const sectionChecks: Array<{ name: string; pattern: RegExp }> = [
    { name: "TODOs section", pattern: /^##\s+TODOs\s*$/m },
    { name: "Final Verification Wave section", pattern: /^##\s+Final Verification Wave\s*$/m },
    { name: "TL;DR section", pattern: /^##\s+TL;DR\s*$/m },
    { name: "Success Criteria section", pattern: /^##\s+Success Criteria\s*$/m },
    { name: "Commit Strategy section", pattern: /^##\s+Commit Strategy\s*$/m },
  ]

  for (const s of sectionChecks) {
    results.push({
      name: s.name,
      description: `${s.name} 存在`,
      passed: s.pattern.test(content),
    })
  }

  // 6-7. 任务格式检查（用 parseOmoPlan 精确统计）
  const plan = parseOmoPlan(content, changeName)
  const todoCount = plan.tasks.filter((t) => !t.isFvw).length
  const fvwCount = plan.tasks.filter((t) => t.isFvw).length

  results.push({
    name: "OMO TODO 任务格式",
    description: `至少有 1 个 OMO 兼容的 TODO 任务（实际: ${todoCount}）`,
    passed: todoCount >= 1,
  })

  results.push({
    name: "OMO FVW 任务格式",
    description: `至少有 1 个 OMO 兼容的 FVW 任务（实际: ${fvwCount}）`,
    passed: fvwCount >= 1,
  })

  const passedChecks = results.filter((r) => r.passed).length

  return {
    valid: passedChecks === results.length,
    totalChecks: results.length,
    passedChecks,
    results,
  }
}

/**
 * 9 个固定 section 的 OMO plan 内容。
 * 顺序固定，与 buildOmoPlan 输出的 ## 标题一一对应。
 */
export interface OmoPlanSections {
  tldr: string
  context: string
  workObjectives: string
  verificationStrategy: string
  executionStrategy: string
  todos: string
  finalVerificationWave: string
  commitStrategy: string
  successCriteria: string
}

/**
 * 按固定 9-section 顺序组装 OMO plan markdown。
 * 9 个 section 标题固定，AI 只需提供每节内容。
 * 输出格式与 OpenCode/OMO 解析器期望完全一致。
 */
export function buildOmoPlan(sections: OmoPlanSections): string {
  const parts: string[] = []

  parts.push("## TL;DR", sections.tldr, "")
  parts.push("## Context", sections.context, "")
  parts.push("## Work Objectives", sections.workObjectives, "")
  parts.push("## Verification Strategy", sections.verificationStrategy, "")
  parts.push("## Execution Strategy", sections.executionStrategy, "")
  parts.push(
    "## TODOs",
    "**OMO 会解析此 section 中的 checkbox 来追踪进度**",
    "",
    sections.todos,
    ""
  )
  parts.push(
    "## Final Verification Wave",
    "**OMO 会解析此 section 中的 checkbox 来判断是否完成**",
    "",
    sections.finalVerificationWave,
    ""
  )
  parts.push("## Commit Strategy", sections.commitStrategy, "")
  parts.push("## Success Criteria", sections.successCriteria, "")

  return parts.join("\n")
}

// ============================================================
// OpenCode tool 入口
// ============================================================

/**
 * Tool: omo_spec_sync_tasks_from_plan
 * 作用：单向同步 OMO plan → OpenSpec tasks.md
 */
export const sync_tasks_from_plan = tool({
  description:
    "单向同步 OMO plan 到 OpenSpec tasks.md。把 `.omo/plans/<change-name>.md` 镜像成 OpenSpec 期望的格式，覆盖 `openspec/changes/<change-name>/tasks.md`。方向：plan → tasks.md（不可反向）。可重入：plan 修改后随时运行。镜像内容包含：任务（TODO/FVW）+ 章节参考（TL;DR、Context、Execution Strategy、Commit Strategy、Success Criteria 等全部 9 章节）。",
  args: {
    change_name: tool.schema
      .string()
      .describe(
        "OpenSpec change 名称。对应路径：`.omo/plans/<change-name>.md` → `openspec/changes/<change-name>/tasks.md`"
      ),
  },
  async execute(args, context) {
    const projectRoot = context.directory
    const planPath = resolve(
      projectRoot,
      ".omo",
      "plans",
      `${args.change_name}.md`
    )
    const tasksPath = resolve(
      projectRoot,
      "openspec",
      "changes",
      args.change_name,
      "tasks.md"
    )

    if (!existsSync(planPath)) {
      throw new Error(`plan 文件不存在：${planPath}`)
    }

    const planContent = readFileSync(planPath, "utf-8")
    const plan = parseOmoPlan(planContent, args.change_name)

    if (plan.tasks.length === 0) {
      throw new Error(
        `plan 中未找到任何任务：${planPath}。请确保 plan 包含 \`## TODOs\` 或 \`## Final Verification Wave\` 章节`
      )
    }

    const tasksContent = generateOpenSpecTasks(plan)
    writeFileSync(tasksPath, tasksContent)

    const completed = plan.tasks.filter((t) => t.completed).length
    const total = plan.tasks.length
    const waves = new Set(plan.tasks.map((t) => t.wave)).size
    const refCount = plan.sections.filter((s) => !s.isCore).length

    return `✅ 同步完成：${planPath} → ${tasksPath}
   任务数：${total}（已完成 ${completed}，未完成 ${total - completed}）
   Wave 数：${waves}
   Plan Reference 章节：${refCount} 个`
  },
})

/**
 * Tool: omo_spec_validate_omo_plan
 * 作用：验证 OMO plan 是否符合 OMO 兼容性（7 项检查）
 */
export const validate_omo_plan = tool({
  description:
    "验证 OMO plan 结构是否符合 OMO 兼容性要求。7 项检查：5 个核心 section 存在（## TODOs、## Final Verification Wave、## TL;DR、## Success Criteria、## Commit Strategy）+ 2 个任务格式（至少 1 个 TODO 任务、至少 1 个 FVW 任务）。返回结构化结果：valid、totalChecks、passedChecks、results（每项检查的 name/description/passed）。",
  args: {
    change_name: tool.schema
      .string()
      .describe(
        "OpenSpec change 名称。读取 `.omo/plans/<change-name>.md` 进行 7 项结构检查。"
      ),
  },
  async execute(args, context) {
    const projectRoot = context.directory
    const planPath = resolve(
      projectRoot,
      ".omo",
      "plans",
      `${args.change_name}.md`
    )

    if (!existsSync(planPath)) {
      throw new Error(`plan 文件不存在：${planPath}`)
    }

    const planContent = readFileSync(planPath, "utf-8")
    const validation = validateOmoPlan(planContent, args.change_name)

    if (!validation.valid) {
      const failed = validation.results.filter((r) => !r.passed)
      const lines = [
        `❌ plan 结构检查失败（${validation.passedChecks}/${validation.totalChecks} 通过）`,
        "",
        "失败项：",
        ...failed.map((r) => `  - ${r.name}: ${r.description}`),
        "",
        "请修复 plan 后重新运行此检查。",
      ]
      return lines.join("\n")
    }

    return `✅ plan 结构检查通过（${validation.passedChecks}/${validation.totalChecks} 项全部通过）`
  },
})

/**
 * Tool: omo_spec_write_new_plan
 * 作用：按 9-section 固定结构写入 OMO 兼容执行计划
 */
export const write_new_plan = tool({
  description:
    "写入 OMO 兼容执行计划到 .omo/plans/<change-name>.md。9 个参数对应 plan 的 9 个固定 section（顺序固定）：TL;DR、Context、Work Objectives、Verification Strategy、Execution Strategy、TODOs、Final Verification Wave、Commit Strategy、Success Criteria。Tool 负责组装 9 个 section 的标题和固定顺序，AI 只需提供各 section 的内容。",
  args: {
    change_name: tool.schema
      .string()
      .describe("OpenSpec change 名称。保存到 `.omo/plans/<change-name>.md`。"),
    tldr: tool.schema
      .string()
      .describe("TL;DR section 内容（1-2 句，引用 proposal.md）"),
    context: tool.schema
      .string()
      .describe("Context section 内容（2-3 句，引用 proposal.md）"),
    work_objectives: tool.schema
      .string()
      .describe(
        "Work Objectives section 内容（每个 capability 及关键 requirement，引用 specs/）"
      ),
    verification_strategy: tool.schema
      .string()
      .describe("Verification Strategy section 内容（引用 specs 的 scenarios）"),
    execution_strategy: tool.schema
      .string()
      .describe("Execution Strategy section 内容（引用 design.md 和 research/）"),
    todos: tool.schema
      .string()
      .describe(
        "TODOs section 内容（OMO 格式：`#### N. [ ] title` + 9 个子字段：What to do / Must NOT do / Recommended Agent Profile / References / Acceptance Criteria / QA Scenarios / Parallelization / Evidence / Commit）"
      ),
    final_verification_wave: tool.schema
      .string()
      .describe(
        "FVW section 内容（OMO 格式：`### FN. [ ] title` + Acceptance Criteria）"
      ),
    commit_strategy: tool.schema
      .string()
      .describe("Commit Strategy section 内容"),
    success_criteria: tool.schema
      .string()
      .describe("Success Criteria section 内容"),
  },
  async execute(args, context) {
    const projectRoot = context.directory
    const planPath = resolve(
      projectRoot,
      ".omo",
      "plans",
      `${args.change_name}.md`
    )

    const sections: OmoPlanSections = {
      tldr: args.tldr,
      context: args.context,
      workObjectives: args.work_objectives,
      verificationStrategy: args.verification_strategy,
      executionStrategy: args.execution_strategy,
      todos: args.todos,
      finalVerificationWave: args.final_verification_wave,
      commitStrategy: args.commit_strategy,
      successCriteria: args.success_criteria,
    }

    const planContent = buildOmoPlan(sections)
    writeFileSync(planPath, planContent)

    return `✅ plan 已写入：${planPath}
   9 个 section 已按固定顺序组装
   建议下一步：调用 \`omo_spec_validate_omo_plan\` 验证 plan 结构`
  },
})
