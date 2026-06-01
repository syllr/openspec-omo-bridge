# openspec-omo-bridge

Custom OpenSpec `spec-driven` schema that bridges OpenSpec workflows with oh-my-openagent (OMO) plan execution.

## Repository purpose

This is a **configuration repository** — not a code project. It houses a customized OpenSpec schema at
`schemas/spec-driven/` that extends the standard spec-driven workflow to generate OMO-compatible `.omo/plans/` plan
files during the `tasks` artifact phase.

## Key files

| Path                               | Purpose                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `schemas/spec-driven/schema.yaml`  | Schema definition. 4 artifacts (proposal → design → specs → tasks) + apply phase                                      |
| `schemas/spec-driven/templates/`   | 4 template files (proposal.md, spec.md, design.md, tasks.md)                                                          |
| `schemas/constitution/schema.yaml` | Simplified 3-stage constitution schema. 3 artifacts (scan → design → apply)                                           |
| `schemas/constitution/templates/`  | 2 template files (scan.md, design.md)                                                                                 |
| `scripts/sync.sh`                  | Unified sync: copies `tools/*.ts` to `~/.config/opencode/tools/` + `schemas/*/` to `~/.local/share/openspec/schemas/` |
| `.opencode/opencode.json`          | OpenCode project config — allows external directory access                                                            |

## Schema architecture

```
proposal → design ──┬──► specs ──┐
                    │            ├──► tasks ──► apply
                    └─────────────┘
```

- `tasks.instruction` does everything: generates `.omo/plans/<name>.md` (OMO plan) + **Metis plan consultation** (PHASE 3, pre-plan strategy advice) + **Oracle gap analysis** (PHASE 2, artifacts coherence) + **Oracle + Momus plan review** (PHASE 4.2, plan review with Part A + Part B dual-gate) + calls `omo_spec_sync_tasks_from_plan` tool to mirror plan into tasks.md + inlines verdict handling (asks user for 🟡/⚪ acceptance)
- `.omo/plans/<name>.md` uses **9 sections** in spec-driven: TL;DR, Context, Work Objectives, Verification Strategy, Execution Strategy, TODOs, Final Verification Wave, Commit Strategy, Success Criteria (7 sections in constitution, skipping Verification Strategy and Commit Strategy per Design Decision 6)
- Non-Tasks sections use "summary + link" pattern (references `openspec/changes/<name>/` artifacts)
- The plan is parsed by `/start-work` (OMO's Atlas agent)

## Quality gates

The following gates apply to the **spec-driven** schema. Constitution schema has its own quality mechanisms documented in the Constitution Schema section.

1. **Spec validation** (tasks PHASE 1.2, mandatory) — runs `openspec validate`, if errors show to user and let user decide how to fix
2. **1 Oracle gap analysis** (tasks PHASE 2, after spec validation) — review of proposal/specs/design coherence before plan generation (Metis **not** used here — Metis is for pre-plan consultation, used only in PHASE 3)
3. **Plan generation with Metis consultation** (tasks PHASE 3, mandatory) — **Metis plan consultation** (pre-plan strategy advice) + AI directly generates `.omo/plans/<name>.md` via `omo_spec_write_new_plan` tool
4. **Plan mirroring** (tasks PHASE 5, mandatory) — call `omo_spec_sync_tasks_from_plan` tool to mirror plan into tasks.md
5. **Plan structure validation** (tasks PHASE 4.1, mandatory) — 11 checks: 9 sections exist (`## TL;DR` / `## Context` / `## Work Objectives` / `## Verification Strategy` / `## Execution Strategy` / `## TODOs` / `## Final Verification Wave` / `## Commit Strategy` / `## Success Criteria`) + at least one `N. Task` format task in TODOs + at least one `FN. Task` format task in FVW
6. **1 parallel Oracle + 1 parallel Momus review** (tasks PHASE 4.2, mandatory) — concurrent review of plan: Oracle reviews spec/design alignment + OMO compatibility; Momus gives final OKAY/REJECT verdict (Part A executable path + Part B risk matrix)
7. **Verdict handling** (tasks PHASE 4.4, hard block) — if 🔴 BLOCKED, fix plan and re-review (max 3 rounds, after 3 rounds ask user to accept risk / manual fix / stop); if 🟡/⚪ remain, ask user to accept risk or fix more; no separate verdict file written
8. **Oracle/Momus invocation** (tasks, mandatory, fast fail) — if any agent call fails (timeout, unavailable, error), immediately stop workflow and report to user; no retry, no degradation, no skip

## Language support

Schema uses `__LANG_PLACEHOLDER__` markers in all 4 artifact + 1 apply instructions (5 for spec-driven, 3 for constitution). The `sync.sh` script replaces them:

```bash
scripts/sync.sh --lang zh            # 中文: "所有生成的文档必须使用中文"
scripts/sync.sh --lang en            # English: "MUST be written in English"
scripts/sync.sh                      # No preference: remove placeholders (default)
scripts/sync.sh --tools-only        # 只同步 tools
scripts/sync.sh --schemas-only      # 只同步 schemas
scripts/sync.sh --dry-run           # 只显示，不实际复制
```

The sync script uses `rm -rf + cp -R` (not `cp -R dir/ dest/` alone, which has macOS directory overwrite quirks).
Arithmetic uses `$((var + 1))` syntax (not `((var++))`) to avoid `set -e` exit on zero.

## Apply phase sync protocol

`apply.instruction` 配合 `omo_spec_sync_tasks_from_plan` OpenCode tool 实现 plan → tasks.md 单向镜像同步：

- **plan 是 source of truth**（OMO 通过解析 plan 的 checkbox 追踪任务完成）
- **tasks.md 是镜像**（供 OpenSpec apply skill 读取显示进度）
- **同步方向单向**：plan → tasks.md（不能反向）
- **同步机制**：`tools/omo-spec.ts`（OpenCode tool，详见下文）

**同步时机**：

- tasks 阶段 PHASE 5：plan 审查通过后立即调用 tool，生成初始 tasks.md 镜像
- apply 阶段 Step 2.5：/start-work 完成后调用 tool，更新 checkbox 状态

**重入性**：tool 是幂等的，每次 plan 修改后都可重新调用。OpenSpec apply skill 不应直接编辑 tasks.md（会被同步覆盖）。

## omo*spec*\* tools

**位置**：`tools/omo-spec.ts`（OpenCode tool 格式，遵循 `@opencode-ai/plugin` 规范）

**架构**：**单文件多 tool 设计** — 所有 OMO 相关 tool 和纯逻辑（types + parser + generator + 4 tool 入口）都在 `omo-spec.ts`。原因：tool 部署到 `~/.config/opencode/tools/` 时是单文件复制，单文件无需处理相对 import 解析问题。

**Tool 命名**（OpenCode 约定，多 tool 模式）：`omo_spec_<exportname>`

- `export const sync_tasks_from_plan = tool({...})` → tool 名 `omo_spec_sync_tasks_from_plan`
- `export const validate_omo_plan = tool({...})` → tool 名 `omo_spec_validate_omo_plan`

**Plugin 懒加载**：用 `require("@opencode-ai/plugin")` + `try/catch` 在模块加载时尝试导入真实 plugin，失败则用 chainable stub 替代。这样：

- **生产环境**（OpenCode 加载 tool）：plugin 存在，用真实实现
- **测试环境**（bridge 项目本地 `bun test`）：bridge 项目不依赖 `@opencode-ai/plugin`，stub 兜底
- 测试 `import { parseOmoPlan, generateOpenSpecTasks, validateOmoPlan } from "../omo-spec"` 复用纯函数

**5 个纯函数**（可独立 import，零 OpenCode 依赖）：

1. `parseOmoPlan(content, changeName): OmoPlan` — 解析 OMO plan markdown 为结构化对象（sections + tasks + fields）
2. `generateOpenSpecTasks(plan): string` — 从 OmoPlan 生成 OpenSpec tasks.md markdown（含 Wave 分组 + Plan Reference 附录）
3. `validateOmoPlan(content, changeName): OmoPlanValidation` — 11 项 OMO 兼容性检查（9 个 section + 2 个任务格式）
4. `buildOmoPlan(sections: OmoPlanSections): string` — 按 9-section 固定顺序组装 OMO plan markdown
5. `prepareVerificationContext(changeName, artifacts, changedFiles): VerificationContext` — 准备实现验证上下文（artifacts + git diff + 5 维度 + verdict 规则）

---

### omo_spec_sync_tasks_from_plan tool

**作用**：单向同步 OMO plan → OpenSpec tasks.md。解决 OMO 和 OpenSpec 的任务格式冲突：

- OMO plan 使用 `#### N. [ ] 标题` 4-hash heading + 扁平 `N.` 编号
- OpenSpec tasks.md 使用 `- [ ] N.M 标题` 列表项 + 多级 `N.M` 编号
- 两个系统解析器互不兼容，本 tool 把 OMO 格式镜像成 OpenSpec 格式

**调用方式**（OpenCode tool 格式）：

AI 在 OpenCode 会话中直接调用：

- tool 名：`omo_spec_sync_tasks_from_plan`
- 参数：`change_name: string`（OpenSpec change 名称）

**输入**：

- `change_name` → 自动定位 `.omo/plans/<name>.md` 和 `openspec/changes/<name>/tasks.md`
- 使用 `context.directory`（OpenCode 注入）作为项目根，不依赖 `process.cwd()`

**输出**：

- 覆盖 `openspec/changes/<name>/tasks.md` 为 OpenSpec 格式
- 包含 Wave 分组的任务（按 `N.M` 重新编号）
- 包含 Plan Reference 附录，保留全部 9 章节（TL;DR、Context、Work Objectives、Verification Strategy、Execution Strategy、TODOs、Final Verification Wave、Commit Strategy、Success Criteria）
- 保留 plan 的 checkbox 状态（`- [ ]` → `- [ ]`，`- [x]` → `- [x]`）

---

### omo_spec_validate_omo_plan tool

**作用**：验证 OMO plan 结构是否符合 OMO 兼容性要求。**11 项检查**（9 个 section + 2 个任务格式）：

| #   | 检查                                          | 类型     |
| --- | --------------------------------------------- | -------- |
| 1   | ## TL;DR section 存在                         | section  |
| 2   | ## Context section 存在                       | section  |
| 3   | ## Work Objectives section 存在               | section  |
| 4   | ## Verification Strategy section 存在         | section  |
| 5   | ## Execution Strategy section 存在            | section  |
| 6   | ## TODOs section 存在                         | section  |
| 7   | ## Final Verification Wave section 存在       | section  |
| 8   | ## Commit Strategy section 存在               | section  |
| 9   | ## Success Criteria section 存在              | section  |
| 10  | 至少 1 个 OMO TODO 任务（`#### N. [ ]` 格式） | 任务格式 |
| 11  | 至少 1 个 OMO FVW 任务（`### FN. [ ]` 格式）  | 任务格式 |

**调用方式**：

- tool 名：`omo_spec_validate_omo_plan`
- 参数：`change_name: string`（OpenSpec change 名称）

**输入**：

- `change_name` → 读取 `.omo/plans/<name>.md`
- 使用 `context.directory`（OpenCode 注入）作为项目根

**输出**：

- ✅ 全部通过（`11/11`）：tool 返回成功消息，可进入下一步
- ❌ 失败（N/11 通过）：tool **抛错**（throw）返回失败项列表，AI 修复 plan 后重跑

**集成点**：

- `tasks.instruction` PHASE 4.1：plan 审查前先做结构检查
- 任何怀疑 plan 格式不正确的场景都可以调用

---

### omo_spec_write_new_plan tool

**作用**：按 9-section 固定结构写入 OMO 兼容执行计划。**锁死 plan 格式** — AI 自由生成时容易漂移（标题错误、section 顺序错、缺字段），用 tool 后 100% 统一。

**9 个固定 section**（顺序固定，tool 负责组装标题和 hint 文本）：

| #   | Section                      | 内容来源                                           |
| --- | ---------------------------- | -------------------------------------------------- |
| 1   | `## TL;DR`                   | proposal.md（1-2 句）                              |
| 2   | `## Context`                 | proposal.md（2-3 句）                              |
| 3   | `## Work Objectives`         | specs/（每个 capability + 关键 requirement）       |
| 4   | `## Verification Strategy`   | specs/ 的 scenarios                                |
| 5   | `## Execution Strategy`      | design.md + research/                              |
| 6   | `## TODOs`                   | OMO 格式 `#### N. [ ] title` + 9 子字段            |
| 7   | `## Final Verification Wave` | OMO 格式 `### FN. [ ] title` + Acceptance Criteria |
| 8   | `## Commit Strategy`         | 提交策略                                           |
| 9   | `## Success Criteria`        | 成功标准                                           |

**调用方式**：

- tool 名：`omo_spec_write_new_plan`
- 参数：10 个 string 参数（`change_name` + 9 个 section 内容）

**关键收益**：

- **格式 100% 一致**：tool 锁死 9-section 结构和顺序，AI 不会写错
- **关键 hint 文本不遗漏**：tool 自动插入 `**OMO 会解析此 section 中的 checkbox 来追踪进度**` 等关键提示
- **AI 简化**：AI 只需生成 9 个 section 的内容，不用记格式

**集成点**：

- `tasks.instruction` PHASE 3：生成 plan 时调用（替代之前 70+ 行的自由生成 prompt）
- 写完后建议紧接调用 `omo_spec_validate_omo_plan` 验证

**配套工具**：

- `omo_spec_validate_omo_plan`：写完后立即验证 11 项 OMO 兼容性
- `omo_spec_sync_tasks_from_plan`：plan 审查通过后镜像到 tasks.md

---

### omo_spec_verify_implementation tool

**作用**：准备 OpenSpec 实现验证的 artifacts 上下文。**只读 artifacts + 组装模板**——不捕获 git diff（由 Oracle 自行执行，避免 Bun.spawn 跨运行时依赖）。

**调用方式**（OpenCode tool 格式）：

AI 在 OpenCode 会话中直接调用：

- tool 名：`omo_spec_verify_implementation`
- 参数：`change_name: string`（OpenSpec change 名称）

**返回**：artifacts 上下文（`VerificationContext`）：

- `artifacts`: `{ proposal, design, specs, plan }` —— 全部内容
- `changedFiles`: `string[]` —— 始终为空数组（占位）
- `dimensions`: 5 维度检查清单（Spec 合规性 / Design 对齐 / Proposal 范围 / Task 完成度 / 非功能性合规性）
- `verdictRules`: BLOCKED / CONDITIONAL / 注意 三类判定规则

**工作流**：

1. AI 调 `omo_spec_verify_implementation` 拿 artifacts + 维度模板
2. AI 把上下文传给 `task(subagent_type="oracle", ...)` 审查
3. **Oracle 自行执行 `git diff --name-only HEAD`**（agent 直接跑 shell，不通过 tool）
4. Oracle 用变更文件 + artifacts + 5 维度输出发现（🔴/🟡/⚪）
5. AI 根据 verdict 决定 PASS / BLOCKED / CONDITIONAL

**为什么不通过 tool 捕获 git diff**：

- Tool 用 `Bun.spawn` 只能跑在 Bun 环境
- Oracle agent 本身就能跑 shell 命令（`Bun.spawn` / Node.js `child_process` 都行）
- 让 agent 做副作用类操作、tool 做纯 I/O 是更清晰的职责分离

**集成点**：

- `apply.instruction` Step 3：实现验证

---

**通用设计原则**：

- **单向 / 只读**：sync tool 是单向写（plan → tasks.md），validate tool 是只读
- **可重入**：sync tool 每次调用都完整覆盖 tasks.md，幂等
- **OpenCode 规范**：使用 `tool()` helper、`export const`（多 tool 模式）、`context.directory`、`async execute(args, context)` 签名
- **同步分发**：`scripts/sync.sh` 把 `tools/*.ts` 复制到 `~/.config/opencode/tools/`，OpenCode 重启后生效
- **过滤非入口文件**：`sync.sh` 跳过 `*-core.ts` / `*-test.ts` 等后缀，避免 OpenCode 误加载非 tool 文件

**格式转换规则**：

| 维度   | OMO plan                                  | → OpenSpec tasks.md                       |
| ------ | ----------------------------------------- | ----------------------------------------- |
| 主章节 | `## TODOs` / `## Final Verification Wave` | `## Tasks`                                |
| Wave   | `### 6.1 Wave 1: 标题`                    | `### Wave 1: 标题`                        |
| 任务   | `#### 1. [ ] 标题`                        | `- [ ] 1.1 标题`                          |
| FVW    | `### F1. [ ] 标题`                        | `- [ ] 8.1 标题`（FVW 作为最后一个 Wave） |
| 字段   | `- **Field**: value`                      | `      **Field**: value`（6 空格缩进）    |

**集成点**：

- `tasks.instruction` PHASE 5：plan 审查通过后立即同步
- `apply.instruction` Step 2.5：/start-work 完成后同步最新状态

**反例（不要做）**：

- ❌ 不要从 tasks.md 反向写回 plan
- ❌ 不要手动编辑 tasks.md（会被下次同步覆盖）
- ❌ 不要在 apply skill 中跳过同步步骤
- ❌ 不要修改 tool 让它支持双向同步（破坏架构）

## External dependencies

Schema 在执行期间依赖以下外部系统和 agent。**所有调用遵循 Fast Fail Rule**（调用失败立即停止，不得重试/降级/跳过）：

| 依赖                  | 类型                 | 用途                                                                                                                                    | 调用方式                                   |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `openspec`            | CLI                  | OpenSpec 工作流管理（new change / validate / archive / list / schema 等）                                                               | `openspec <subcommand>`                    |
| `/start-work`         | OMO command          | 解析并执行 OMO plan（通过 Atlas agent）                                                                                                 | `/start-work .omo/plans/<change-name>.md`  |
| Atlas agent           | OMO 内置 agent       | 解析 plan 中的 checkbox，调度 task 执行                                                                                                 | OMO 内部组件，无需 AI 显式调用             |
| `oracle` agent        | Read-only 高 IQ 审查 | 差距分析（tasks PHASE 2）/ plan 审查（tasks PHASE 4.2）/ 实现验证（apply Step 3）                                                       | `task(subagent_type="oracle", ...)`        |
| `metis` agent         | Pre-plan 咨询        | 提供 plan 策略建议（**仅**在 tasks PHASE 3 调用一次）                                                                                   | `task(subagent_type="metis", ...)`         |
| `momus` agent         | Plan 评审            | 双重门禁审查 Part A（可执行性）+ Part B（风险矩阵）                                                                                     | `task(subagent_type="momus", ...)`         |
| `omo-spec.ts` tools   | OpenCode tool        | 4 个工具：`omo_spec_write_new_plan` / `omo_spec_validate_omo_plan` / `omo_spec_sync_tasks_from_plan` / `omo_spec_verify_implementation` | OpenCode tool system 自动调用              |
| `@opencode-ai/plugin` | NPM 包               | 提供 `tool()` helper 和 chainable schema builder                                                                                        | `require("@opencode-ai/plugin")`（懒加载） |

**agent 数量限制**（基于实际成本）：

- `oracle`：可并行（同一 PHASE 多个 review）
- `metis`：每个 tasks 阶段**最多 1 次**（PHASE 3 咨询）
- `momus`：每个 tasks 阶段**最多 1 次**（PHASE 4.2 审查，与 oracle 并行）

**版本要求**（schema 不强制，由 OpenCode/OMO 自身负责）：

- OpenSpec CLI ≥ 最新版（`openspec instructions` 命令支持 schema-specific 输出）
- OpenCode ≥ 支持多 tool 模式的版本
- OMO ≥ 支持 Atlas agent 和 `/start-work` 命令的版本

## Spec validation rules

`schema.yaml` specs.instruction includes `openspec validate` rules:

- Requirement must contain uppercase `MUST` or `SHALL` (Chinese "必须" fails)
- Scenario uses exactly 4 `#` (`#### Scenario:`)
- Each requirement ≥1 scenario with WHEN/THEN
- AI is instructed to run `openspec validate <change-name>` after writing specs

## Constitution Schema

A standalone `constitution` schema is available alongside the default `spec-driven` schema. It provides a standardized workflow for project constitution initialization and updates.

**Purpose**: Manage project-level metadata — tech stack, coding standards, architecture constraints, and testing conventions — that exist independently of individual changes.

**Artifact chain** (3 steps):

```
scan → design → apply
```

- **scan**: Ask user to select a constitution dimension (code-conventions, architecture, domain, integration, api, security, testing, observability, release, documentation). Checks existing entries in AGENTS.md for deduplication.
- **design**: Multi-agent research for best practices per dimension. Designs the constitution.yaml output structure.
- **apply**: Creates `docs/constitution/<dimension>/` with reference files and appends entries to AGENTS.md `## Constitution` section. Supports INIT (new), APPEND (new tech_stack), and UPDATE (overwrite existing) modes.

**Output**: AGENTS.md (`## Constitution` section with dimension index) + `docs/constitution/<dimension>/` with reference files.

**Simplification note**: Tasks and critic artifacts were removed because constitution only generates a few documentation files — complex plan generation and multi-agent review (Oracle + Metis + Momus) were overkill. Apply directly creates files based on design output, bypassing `/start-work`.

**Re-entrant design**: Re-run `openspec new change --schema constitution <name>` at any time. Apply detects existing files to determine init/update/incomplete mode.

**Usage**:

```bash
# Create a new constitution change (init or update)
openspec new change --schema constitution my-constitution
```

**Single-module vs multi-module**: For single-module projects, references are flat under `references/`. For multi-module monorepos (e.g., frontend + backend + model-service), references are organized per-module subdirectory. Cross-module architecture constraints go in top-level `architecture.md`.

## Architecture constraints

- **Do NOT modify** `requires`, `generates`, or `tracks` fields — they define the dependency graph
- **Do NOT modify** OMO source code or built-in schemas — this repo only overrides the custom schema layer
- The `design` artifact is **mandatory** (`tasks.requires: [specs, design]`)
- Plan file is **not tracked** by OpenSpec's `detectCompleted()` — it's a side effect of the tasks instruction

## CLI testing

Schema changes affect AI behavior during `openspec-ff-change` / `openspec-apply-change`, so testing requires actually
running the AI, not just static validation.

### Setup

```bash
# 1. OpenCode Web 插件必须在 JetBrains IDE 中运行（端口 12396）
# 2. 进入临时测试目录
cd ~/tmp
```

### Run a test

````bash
# 先初始化一个测试项目
mkdir -p /tmp/test-project && cd /tmp/test-project
git init
mkdir -p openspec/schemas/spec-driven .opencode
# 复制当前仓库的 schema 到测试项目
cp -R /Users/yutao/Projects/openspec-omo-bridge/schemas/spec-driven/* openspec/schemas/spec-driven/
# 添加目录权限（避免 AI 申请权限打断流程）
cat > .opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "external_directory": "allow", "read": "allow", "write": "allow" }
}
EOF
# 处理语言占位符（替换 __LANG_PLACEHOLDER__ 为中文提示）
sed -i '' 's/__LANG_PLACEHOLDER__/**语言**: 所有生成的文档必须使用中文。/g' openspec/schemas/spec-driven/schema.yaml

bunx oh-my-opencode run --attach http://127.0.0.1:12396 "\
在 /tmp/test-project 中，使用 openspec-ff-change 创建一个名为 hello-world 的 change。\
这个 change 的功能是：在项目中添加一个 README.md 文件，内容是 '# Hello World'。\
请完成 proposal → specs → design → tasks 所有阶段，然后执行 apply 完成任务。\
"

- If `Unable to connect`: OpenCode Web plugin not running in IDE
- If `Unauthorized`: restart the IDE plugin
- Clean up test files: `rm -rf /tmp/test-project`

### Parallel tests

For multiple test cases, fan out with `run_in_background=true`:

```typescript
task(
    (category = "quick"),
    (load_skills = []),
    (run_in_background = true),
    (prompt = "...bunx oh-my-opencode run..."),
);
````

## Git

- Remote: `git@github.com:syllr/openspec-omo-bridge.git`
- Branch: `main`
- All commits require user authorization per `git-commit-block` rule
