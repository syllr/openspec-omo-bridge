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

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs"
import { resolve, dirname, basename } from "node:path"

// 懒加载 plugin：生产用真实实现，测试用 chainable stub
// `tool` 是可调用对象（用于 `tool(config)` 包裹 tool 定义）
// 同时 `tool.schema` 是 chainable schema builder（用于 `tool.schema.string().describe()`）
type ToolFactory = { (config: any): any; schema: any }
let tool: ToolFactory
try {
  // @ts-expect-error - require 在 Bun/Node ESM 中可用，TypeScript 不识别
  const plugin = require("@opencode-ai/plugin") as { tool: ToolFactory }
  tool = plugin.tool
} catch {
  const chainable: any = new Proxy(
    function () {
      return chainable
    },
    {
      get(_target, prop) {
        if (typeof prop === "symbol") return undefined
        if (prop === "apply" || prop === "call" || prop === "bind") return undefined
        return () => chainable
      },
    }
  )
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

/**
 * 解析 OMO plan markdown 为结构化对象。支持 \r\n / \n / \r 行尾。
 * @param content plan 文件的 markdown 原文
 * @param changeName OpenSpec change 名称，回填到返回对象的 changeName 字段
 * @returns OmoPlan { changeName, sections[], tasks[] }
 * @throws 不会抛出；解析失败时返回空 plan（不抛）
 */
export function parseOmoPlan(content: string, changeName: string): OmoPlan {
  // 防御性 null/undefined 检查（A6）
  if (!content) {
    return { changeName, sections: [], tasks: [] }
  }
  // 支持 \r\n, \n, 单独 \r（A32）
  const lines = content.split(/\r\n|\r|\n/)
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
      /^###\s+(?:\d+(?:\.\d+)*\s+)?Wave\s+(\d+)[:：]\s*(.*)$/
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
        completed: fvwTaskMatch[2].trim().toLowerCase() === "x",
        wave: "Final Verification Wave",
        isFvw: true,
        fields: [],
      }
      tasks.push(currentTask)
      currentField = null
      continue
    }

    const todoTaskMatch = line.match(
      /^####\s+(\d+)\.\s*\[\s*([ xX])\s*\]\s*(.+)$/
    )
    if (currentSection.title.toLowerCase() === "todos" && todoTaskMatch) {
      const completed = todoTaskMatch[2].trim().toLowerCase() === "x"
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

/**
 * 从 OmoPlan 生成 OpenSpec tasks.md markdown。包含 Wave 分组 + Plan Reference 附录。
 * @param plan parseOmoPlan 返回的结构化 plan 对象
 * @returns tasks.md 完整 markdown 字符串（带 checkbox 状态）
 * @throws 不会抛出；plan.tasks 为空时返回带 Plan Reference 但无 task 的最小结构
 */
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
    // 空 wave 标签处理（A9）：用 "Unassigned" 代替空字符串
    const waveLabel = wave.trim() || "Unassigned"
    lines.push(`### ${waveLabel}`)
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
 * 验证 OMO plan 结构是否符合 OMO 兼容性要求。11 项检查：9 个 section 存在 + 2 个任务格式。
 * 接受两种 heading 格式：`## TL;DR` 或 `## 1. TL;DR`（数字编号常见于 OMO 项目）。
 * @param content plan 文件的 markdown 原文
 * @param changeName OpenSpec change 名称（用于 parseOmoPlan 调用）
 * @returns OmoPlanValidation { valid, totalChecks, passedChecks, results: OmoPlanCheck[] }
 * @throws 不会抛出；返回的 valid 字段标记是否通过
 */
export function validateOmoPlan(
  content: string,
  changeName: string
): OmoPlanValidation {
  const results: OmoPlanCheck[] = []

  // 1-9. Section 存在性检查（A10）：从 5 项扩展到 9 项，覆盖全部 plan sections
  // 接受两种格式：`## TL;DR` 或 `## 1. TL;DR`（数字编号常见于 OMO 项目）
  const sectionChecks: Array<{ name: string; pattern: RegExp }> = [
    { name: "TL;DR section", pattern: /^##\s+(?:\d+\.\s+)?TL;DR\s*$/m },
    { name: "Context section", pattern: /^##\s+(?:\d+\.\s+)?Context\s*$/m },
    { name: "Work Objectives section", pattern: /^##\s+(?:\d+\.\s+)?Work Objectives\s*$/m },
    { name: "Verification Strategy section", pattern: /^##\s+(?:\d+\.\s+)?Verification Strategy\s*$/m },
    { name: "Execution Strategy section", pattern: /^##\s+(?:\d+\.\s+)?Execution Strategy\s*$/m },
    { name: "TODOs section", pattern: /^##\s+(?:\d+\.\s+)?TODOs\s*$/m },
    { name: "Final Verification Wave section", pattern: /^##\s+(?:\d+\.\s+)?Final Verification Wave\s*$/m },
    { name: "Commit Strategy section", pattern: /^##\s+(?:\d+\.\s+)?Commit Strategy\s*$/m },
    { name: "Success Criteria section", pattern: /^##\s+(?:\d+\.\s+)?Success Criteria\s*$/m },
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
 * Tool 调用参数 → 推导 change 上下文。
 * - 接受 `change_name` (可选) + `plan_file_path` (可选),**至少传一个**
 * - 优先用 `plan_file_path` 推 `change_name`(basename 去掉 `.md`)
 * - 仅传 `change_name` 时,从 `<projectRoot>/.omo/plans/<change_name>.md` 推 `plan_path`
 * - 两者都传时验证一致性
 * @param args tool 调用 args (只取 change_name 和 plan_file_path 两个字段)
 * @param projectRoot OpenCode context.directory
 * @returns 解析后的 changeName / planPath / changeDir
 * @throws 缺参数 / 不一致 / 路径格式错误时 throw
 */
export interface ResolvedChangeContext {
  changeName: string
  planPath: string
  changeDir: string
}

export function resolveChangeContext(
  args: { change_name?: string; plan_file_path?: string },
  projectRoot: string
): ResolvedChangeContext {
  if (args.change_name !== undefined && typeof args.change_name !== "string") {
    throw new Error(
      `❌ 参数类型错误：change_name\n` +
        `   收到类型：${typeof args.change_name}（值：${JSON.stringify(args.change_name)}）\n` +
        `   应传：string 或省略`
    )
  }
  if (args.plan_file_path !== undefined && typeof args.plan_file_path !== "string") {
    throw new Error(
      `❌ 参数类型错误：plan_file_path\n` +
        `   收到类型：${typeof args.plan_file_path}（值：${JSON.stringify(args.plan_file_path)}）\n` +
        `   应传：string 或省略`
    )
  }

  const cn = args.change_name?.trim() || ""
  const pp = args.plan_file_path?.trim() || ""

  if (!cn && !pp) {
    throw new Error(
      `❌ 至少传一个参数：change_name 或 plan_file_path\n` +
        `   用途：定位 change 目录和 plan 文件\n` +
        `   修复：传 change_name='my-change' 或 plan_file_path='${resolve(projectRoot, ".omo", "plans", "my-change.md")}'`
    )
  }

  let changeName: string
  let planPath: string

  if (pp) {
    if (!pp.endsWith(".md")) {
      throw new Error(
        `❌ plan_file_path 必须以 .md 结尾：${pp}\n` +
          `   修复：传 .omo/plans/<change-name>.md 这样的绝对路径`
      )
    }
    planPath = pp
    const base = basename(pp, ".md")
    if (!base) {
      throw new Error(
        `❌ plan_file_path 格式错误：${pp}\n` +
          `   修复：传 .omo/plans/<change-name>.md 这样的绝对路径`
      )
    }
    changeName = base
    if (cn && cn !== changeName) {
      throw new Error(
        `❌ change_name='${cn}' 与 plan_file_path 推导出 change_name='${changeName}' 不一致\n` +
          `   修复：传一致的 change_name 和 plan_file_path,或只传其中一个`
      )
    }
  } else {
    changeName = cn
    planPath = resolve(projectRoot, ".omo", "plans", `${changeName}.md`)
  }

  if (changeName.includes("/") || changeName.includes("\\")) {
    throw new Error(
      `❌ change_name 不能包含路径分隔符：${changeName}\n` +
        `   修复：传纯名称（不含 '/' 或 '\\'），如 'my-change'`
    )
  }
  if (changeName === "." || changeName === "..") {
    throw new Error(
      `❌ change_name 不能是 '.' 或 '..'\n` +
        `   修复：传有效的 change 名称，如 'my-change'`
    )
  }

  const changeDir = resolve(projectRoot, "openspec", "changes", changeName)

  return { changeName, planPath, changeDir }
}

// ============================================================
// OpenCode tool 入口
// ============================================================

/**
 * Tool: omo_spec_sync_tasks_from_plan
 * 作用：同步 OMO plan → OpenSpec tasks.md。传 change_name 同步单个，不传批量同步全部。
 * 底层判断逻辑统一：1) plan 文件存在 2) 非归档 change 目录存在 3) 匹配则同步。
 */
export const sync_tasks_from_plan = tool({
  description:
    "Mirror an OMO plan to OpenSpec tasks.md. **With `change_name` or `plan_file_path`**: sync only that one plan. **Without either** (batch mode): scan `.omo/plans/*.md`, for each plan look up `openspec/changes/<plan-name>/` (skipping `archive/` subdirectory), and sync if a matching non-archived change exists. Skipped plans are reported with a reason. Reentrant.",
  args: {
    change_name: tool.schema
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional. The OpenSpec change name. If provided (with or without plan_file_path), sync only that one plan. If both change_name and plan_file_path are omitted, batch-sync all plans in `.omo/plans/`."
      ),
    plan_file_path: tool.schema
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional. Absolute path to the plan markdown file. The change name is derived from the basename. If provided (with or without change_name), sync only that one plan. If both are omitted, batch-sync all plans."
      ),
  },
  async execute(args, context) {
    const cn = args.change_name?.trim() || ""
    const pp = args.plan_file_path?.trim() || ""
    const hasInput = !!(cn || pp)
    let resolved: ResolvedChangeContext | null = null
    if (hasInput) {
      resolved = resolveChangeContext({ change_name: cn, plan_file_path: pp }, context.directory)
    }

    const projectRoot = context.directory
    const plansDir = resolve(projectRoot, ".omo", "plans")
    const changesDir = resolve(projectRoot, "openspec", "changes")

    if (resolved === null && !existsSync(plansDir)) {
      throw new Error(
        `❌ plans 目录不存在：${plansDir}\n   修复：确认在 OpenSpec 项目根目录执行`
      )
    }

    if (resolved !== null) {
      if (!existsSync(resolved.planPath)) {
        throw new Error(
          `❌ plan 文件不存在：${resolved.planPath}\n   修复：确认 .omo/plans/${resolved.changeName}.md 已创建`
        )
      }
      if (!existsSync(resolved.changeDir)) {
        throw new Error(
          `❌ change 目录不存在：${resolved.changeDir}\n   修复：运行 openspec new change --schema spec-driven ${resolved.changeName}`
        )
      }
    }

    const targetPlanFiles: string[] = resolved !== null
      ? [basename(resolved.planPath)]
      : readdirSync(plansDir).filter((f) => f.endsWith(".md"))

    if (targetPlanFiles.length === 0) {
      return {
        title: "sync_tasks_from_plan: empty",
        output: `ℹ️ ${plansDir} 下没有 .md plan 文件，无可同步内容`,
        metadata: { mode: resolved ? "single" : "batch", synced: [], skipped: [] },
      }
    }

    const synced: Array<{ change: string; total: number; completed: number; waves: number; tasksPath: string }> = []
    const skipped: Array<{ plan: string; reason: string }> = []

    for (const planFile of targetPlanFiles) {
      let planPath: string
      let planChangeName: string
      let changeDir: string

      if (resolved !== null) {
        planPath = resolved.planPath
        planChangeName = resolved.changeName
        changeDir = resolved.changeDir
      } else {
        planChangeName = basename(planFile, ".md")
        planPath = resolve(plansDir, planFile)
        changeDir = resolve(changesDir, planChangeName)
      }
      const tasksPath = resolve(changeDir, "tasks.md")

      const planStat = statSync(planPath, { throwIfNoEntry: false })
      if (!planStat?.isFile()) {
        skipped.push({ plan: planFile, reason: `跳过非文件条目：${planFile}` })
        continue
      }

      if (planChangeName === "archive" || !existsSync(changeDir)) {
        skipped.push({
          plan: planFile,
          reason: `无匹配的 change 目录（openspec/changes/${planChangeName}/）`,
        })
        continue
      }

      let plan
      try {
        const planContent = readFileSync(planPath, "utf-8")
        plan = parseOmoPlan(planContent, planChangeName)
      } catch (e) {
        skipped.push({ plan: planFile, reason: `parse 失败：${(e as Error).message}` })
        continue
      }

      if (plan.tasks.length === 0) {
        skipped.push({ plan: planFile, reason: "plan 中无任务（0 tasks）" })
        continue
      }

      try {
        const tasksContent = generateOpenSpecTasks(plan)
        mkdirSync(dirname(tasksPath), { recursive: true })
        writeFileSync(tasksPath, tasksContent)
        synced.push({
          change: planChangeName,
          total: plan.tasks.length,
          completed: plan.tasks.filter((t) => t.completed).length,
          waves: new Set(plan.tasks.map((t) => t.wave)).size,
          tasksPath,
        })
      } catch (e) {
        skipped.push({ plan: planFile, reason: `写文件失败：${(e as Error).message}` })
      }
    }

    if (resolved !== null) {
      const cn2 = resolved.changeName
      const s = synced[0]
      const k = skipped[0]
      if (s) {
        return {
          title: `sync_tasks_from_plan: ${s.change}`,
          output: `✅ ${s.change}: 同步完成（${s.total} tasks, ${s.completed} ✅, ${s.waves} waves）\n   ${s.tasksPath}`,
          metadata: { mode: "single", changeName: s.change, total: s.total, completed: s.completed, waves: s.waves, tasksPath: s.tasksPath },
        }
      }
      if (k) {
        return {
          title: `sync_tasks_from_plan: skip ${cn2}`,
          output: `⏭️ ${cn2}: ${k.reason}`,
          metadata: { mode: "single", changeName: cn2, synced: 0, reason: k.reason },
        }
      }
      return {
        title: `sync_tasks_from_plan: empty ${cn2}`,
        output: `ℹ️ ${cn2} 无可同步内容`,
        metadata: { mode: "single", changeName: cn2, synced: 0 },
      }
    }

    const lines: string[] = []
    lines.push(`✅ 批量同步完成：${synced.length} 个 change 已同步，${skipped.length} 个 plan 跳过`)
    if (synced.length > 0) {
      lines.push("")
      lines.push("📦 已同步：")
      for (const s of synced) {
        lines.push(`   - ${s.change}: ${s.total} tasks (${s.completed} ✅), ${s.waves} waves → ${s.tasksPath}`)
      }
    }
    if (skipped.length > 0) {
      lines.push("")
      lines.push("⏭️  跳过：")
      for (const s of skipped) {
        lines.push(`   - ${s.plan}: ${s.reason}`)
      }
    }
    return {
      title: `sync_tasks_from_plan: batch (${synced.length} synced, ${skipped.length} skipped)`,
      output: lines.join("\n"),
      metadata: { mode: "batch", synced, skipped },
    }
  },
})

/**
 * Tool: omo_spec_validate_omo_plan
 * 作用：验证 OMO plan 是否符合 OMO 兼容性（11 项检查）
 */
export const validate_omo_plan = tool({
  description:
    "Validate an OMO plan for OMO compatibility. 11 checks: 9 required sections (## TL;DR, ## Context, ## Work Objectives, ## Verification Strategy, ## Execution Strategy, ## TODOs, ## Final Verification Wave, ## Commit Strategy, ## Success Criteria) + 2 task-format checks (at least one `#### N. [ ]` TODO + at least one `### FN. [ ]` FVW). Returns structured result: valid, totalChecks, passedChecks, results.",
  args: {
    change_name: tool.schema
      .string()
      .min(1)
      .optional()
      .describe(
        "The OpenSpec change name. Optional if plan_file_path is provided."
      ),
    plan_file_path: tool.schema
      .string()
      .min(1)
      .optional()
      .describe(
        "Absolute path to the plan markdown file, e.g. `<projectRoot>/.omo/plans/<change-name>.md`. Optional if change_name is provided."
      ),
  },
  async execute(args, context) {
    const { changeName, planPath } = resolveChangeContext(args, context.directory)

    if (!existsSync(planPath)) {
      throw new Error(
        `❌ plan 文件不存在：${planPath}\n   修复：确认 .omo/plans/${changeName}.md 已创建`
      )
    }

    const planContent = readFileSync(planPath, "utf-8")
    const validation = validateOmoPlan(planContent, changeName)

    if (!validation.valid) {
      const failed = validation.results.filter((r) => !r.passed)
      const failedList = failed
        .map((r) => `  - ${r.name}: ${r.description}`)
        .join("\n")
      throw new Error(
        `❌ plan 结构检查失败（${validation.passedChecks}/${validation.totalChecks} 通过）\n\n` +
          `失败项：\n${failedList}\n\n` +
          `请修复 plan 后重新运行此检查。`
      )
    }

    return {
      title: `validate_omo_plan: ${changeName} (${validation.passedChecks}/${validation.totalChecks})`,
      output: `✅ plan 结构检查通过（${validation.passedChecks}/${validation.totalChecks} 项全部通过）`,
      metadata: {
        changeName,
        valid: validation.valid,
        passedChecks: validation.passedChecks,
        totalChecks: validation.totalChecks,
        results: validation.results,
      },
    }
  },
})

// ============================================================
// verify_implementation（替换 apply Step 3 的 5 维度 Oracle 验证）
// ============================================================

export interface VerificationDimension {
  name: string
  description: string
  checks: string[]
}

export interface VerificationContext {
  changeName: string
  artifacts: {
    proposal: string | null
    design: string | null
    specs: string | null
    plan: string | null
  }
  /**
   * 变更文件列表 — 由 Oracle agent 自行执行 `git diff --name-only HEAD` 获取
   * （不通过 tool，避免 Bun.spawn 跨运行时依赖，参见 Oracle review #22 的讨论）
   */
  changedFiles: string[]
  dimensions: VerificationDimension[]
  verdictRules: {
    blocked: string
    conditional: string
    note: string
  }
}

export const VERIFICATION_DIMENSIONS: VerificationDimension[] = [
  {
    name: "Spec 合规性",
    description: "每个 spec requirement 的 scenario 是否在实现中有对应体现",
    checks: [
      "实现行为是否满足 spec 中 WHEN/THEN 的条件？",
      "每个 requirement 的 scenario 是否有对应代码/配置/文档？",
    ],
  },
  {
    name: "Design 对齐",
    description: "实现方案是否符合 design.md 的技术决策",
    checks: [
      "实现方案是否符合 design.md 的技术决策？",
      "design 中明确排除的 Non-Goals 是否在实现中出现？",
      "research/ 中的调研结论是否在实现中得到正确应用？",
    ],
  },
  {
    name: "Proposal 范围",
    description: "实现内容是否在 proposal 定义的 Capabilities 范围内",
    checks: [
      "实现内容是否在 proposal 定义的 Capabilities 范围内？",
      "是否有超出 proposal 范围的 scope leak？",
      "proposal 中的所有 Capability 是否都有对应实现？",
    ],
  },
  {
    name: "Task 完成度",
    description: "plan 中的所有 task 是否都有对应的实现产出",
    checks: [
      "plan 中的所有 task 是否都有对应的实现产出？",
      "plan 中每个 task 的 Evidence 路径是否存在？",
      "关键 task 的 evidence 内容是否与 Acceptance Criteria 匹配？",
    ],
  },
  {
    name: "非功能性合规性",
    description: "性能/安全/兼容性等非功能性要求是否达标",
    checks: [
      "性能要求（响应时间、吞吐量等）是否达标？",
      "安全相关决策（认证、授权、加密）是否在实现中正确应用？",
      "兼容性约束是否被遵守？",
    ],
  },
]

export const VERDICT_RULES = {
  blocked: "存在严重的实现偏离，必须修复才能继续",
  conditional: "实现基本正确但有 🟡/⚪ 瑕疵，可接受风险继续推进",
  note: "请谨慎区分 BLOCKED 和 CONDITIONAL。只有确实阻碍功能正确性的问题才标 🔴。",
}

/**
 * 组装实现验证上下文（artifacts + 5 维度检查清单 + verdict 规则）。
 * 变更文件列表由 Oracle agent 自行执行 `git diff --name-only HEAD` 获取（不通过 tool，避免 Bun.spawn 跨运行时依赖）。
 * @param changeName OpenSpec change 名称
 * @param artifacts 4 个 artifact 的内容（proposal / design / specs / plan），缺失传 null
 * @param changedFiles 占位数组（始终传空数组，Oracle 自取）
 * @returns VerificationContext 含 artifacts、5 维度清单、3 条 verdict 规则
 * @throws 不会抛出；artifact 缺失时返回 null 值
 */
export function prepareVerificationContext(
  changeName: string,
  artifacts: {
    proposal: string | null
    design: string | null
    specs: string | null
    plan: string | null
  },
  changedFiles: string[]
): VerificationContext {
  return {
    changeName,
    artifacts,
    changedFiles,
    dimensions: VERIFICATION_DIMENSIONS,
    verdictRules: VERDICT_RULES,
  }
}

// ============================================================
// 工具实现
// ============================================================

function readIfExists(path: string): string | null {
  if (!existsSync(path)) return null
  return readFileSync(path, "utf-8")
}

/**
 * Tool: omo_spec_verify_implementation
 * 作用：准备实现验证上下文（artifacts + git diff + 5 维度检查清单）
 */
/**
 * Tool: omo_spec_prepare_verification_context
 * 作用：读取 change 的所有 artifacts（proposal/design/specs/plan）+ 组装 5 维度验证清单 + 严重程度规则。
 * 给 Oracle agent 用，agent 自行执行 git diff（避免 Bun.spawn 跨运行时依赖）。
 */
export const prepare_verification_context = tool({
  description:
    "Read all artifacts of an OpenSpec change (proposal / specs / design / plan) and assemble a verification context. Returns: artifact contents + 5-dimension review checklist (Spec/Design/Proposal/Task/Non-functional compliance) + verdict rules (BLOCKED / CONDITIONAL / note). The calling agent (Oracle) should then run `git diff --name-only HEAD` itself to get changed files for the review.",
  args: {
    change_name: tool.schema
      .string()
      .min(1)
      .optional()
      .describe(
        "The OpenSpec change name. Optional if plan_file_path is provided."
      ),
    plan_file_path: tool.schema
      .string()
      .min(1)
      .optional()
      .describe(
        "Absolute path to the plan markdown file. Optional if change_name is provided."
      ),
  },
  async execute(args, context) {
    const { changeName, planPath, changeDir } = resolveChangeContext(args, context.directory)

    const proposal = readIfExists(resolve(changeDir, "proposal.md"))
    const design = readIfExists(resolve(changeDir, "design.md"))
    const plan = readIfExists(planPath)

    let specs: string | null = null
    const specsDir = resolve(changeDir, "specs")
    if (existsSync(specsDir)) {
      const parts: string[] = []
      for (const capDir of readdirSync(specsDir, { withFileTypes: true })) {
        if (!capDir.isDirectory()) continue
        const specFile = resolve(specsDir, capDir.name, "spec.md")
        const content = readIfExists(specFile)
        if (content) parts.push(`### ${capDir.name}\n\n${content}`)
      }
      if (parts.length > 0) specs = parts.join("\n\n")
    }

    const ctx = prepareVerificationContext(
      changeName,
      { proposal, design, specs, plan },
      []
    )

    // 格式化输出
    const out: string[] = [
      `=== 实现验证上下文已准备 (change: ${ctx.changeName}) ===`,
      "",
      "ℹ️ 变更文件列表请由 Oracle 自行执行：",
      "   git diff --name-only HEAD",
      "   (空仓库时 fallback) git ls-files --others --exclude-standard",
      "",
      "=== Artifacts ===",
      "",
    ]
    if (ctx.artifacts.proposal)
      out.push(`## Proposal\n\n${ctx.artifacts.proposal}\n`)
    if (ctx.artifacts.design)
      out.push(`## Design\n\n${ctx.artifacts.design}\n`)
    if (ctx.artifacts.specs)
      out.push(`## Specs\n\n${ctx.artifacts.specs}\n`)
    if (ctx.artifacts.plan)
      out.push(`## Plan\n\n${ctx.artifacts.plan}\n`)

    out.push("=== 验证维度（5 维度）===")
    out.push("")
    ctx.dimensions.forEach((dim, i) => {
      out.push(`${i + 1}. ${dim.name} — ${dim.description}`)
      for (const check of dim.checks) {
        out.push(`   - ${check}`)
      }
    })

    out.push("")
    out.push("=== Verdict Rules ===")
    out.push(`- 🔴 BLOCKED: ${ctx.verdictRules.blocked}`)
    out.push(`- ⚠️ CONDITIONAL: ${ctx.verdictRules.conditional}`)
    out.push(`- ${ctx.verdictRules.note}`)

    out.push("")
    out.push("--- 下一步：Oracle 拿到此上下文后：(1) 自行执行 git diff 获取变更文件 (2) 按 5 维度输出发现 ---")

    return {
      title: `prepare_verification_context: ${ctx.changeName}`,
      output: out.join("\n"),
      metadata: {
        changeName: ctx.changeName,
        artifacts: ctx.artifacts,
        dimensions: ctx.dimensions,
        verdictRules: ctx.verdictRules,
      },
    }
  },
})
