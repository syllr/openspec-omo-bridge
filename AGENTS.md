# openspec-omo-bridge

OpenSpec `spec-driven` + `constitution` 自定义 schema + 2 个 omo-apply-change 脚本（`inspect-apply` / `sync-plan-to-tasks`），把 OpenSpec 工作流桥接到 oh-my-openagent (OMO) plan 执行。

**这是一个配置仓库**，不是代码项目。AI 在 OMO 里跑 OpenSpec 工作流时用这些 schema/script。

## Setup

```bash
git clone … && cd openspec-omo-bridge
git submodule update --init --recursive   # refs/ 下 12 个仓库是 submodules
bun install                                # 跑 bun test 前
```

`.opencode/` 是项目级 OpenCode 配置（gitignore,11 个 openspec-\* skill,仅本项目用）;`.omo/` 是 OMO plan 运行时目录（per-developer,gitignore）。

## Layout

| 路径                                                    | 用途                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas/spec-driven/`                                  | 主 schema：4 artifacts（proposal → design → specs → tasks）+ apply。`schema.yaml` 445 行。                                                                        |
| `schemas/constitution/`                                 | 简化 schema：2 artifacts（scan → design）+ apply。`schema.yaml` 285 行。                                                                                          |
| `schemas/*/templates/`                                  | 各 artifact 的 markdown 模板。                                                                                                                                    |
| `skills/omo-apply-change/scripts/sync-plan-to-tasks.ts` | 模块 + 脚本双身份：3 个 export（`parseOmoPlan` / `generateOpenSpecTasks` / `syncPlanToTasksFile`）+ CLI 主流程。`import.meta.main` 保护，被 import 时不执行 CLI。 |
| `skills/omo-apply-change/scripts/inspect-apply.ts`      | 拉取 apply 阶段 change 上下文的 CLI 工具（合并 `openspec status` + `openspec instructions apply`）。                                                              |
| `skills/omo-apply-change/scripts/__tests__/`            | 5 个测试文件 / 264 测试。`bun test skills/omo-apply-change/scripts/__tests__/`。                                                                                  |
| `scripts/sync.sh`                                       | 部署 schemas + skills（**不部署 scripts**——scripts 随 skill 同步到全局）。详见下节。                                                                              |
| `.opencode/skills/openspec-*/`                          | 11 个项目级 OpenSpec skill，gitignore，不被 sync.sh 处理。                                                                                                        |
| `skills/omo-apply-change/`                              | 同步到全局的 OMO apply skill（含 scripts/）。                                                                                                                     |
| `openspec/config.yaml`                                  | OpenSpec 工作区配置（默认 `schema: spec-driven`）。                                                                                                               |

## Workflow

```
proposal → design ──┬──► specs ──┐
                    │            ├──► tasks ──► apply (Oracle verify) ──► archive
                    └─────────────┘
constitution: scan → design → apply（无 tasks/critic；2 artifacts + apply）
```

`tasks.instruction` PHASE 3 让 AI 写 `.omo/plans/<name>.md`(OMO 9 章节格式)。constitution 用 7 章节（跳过 Verification Strategy + Commit Strategy）。

## Sync（部署）

`scripts/sync.sh` 把仓库 → 全局目录（**单向、可重入**）：

| 源           | 目标                               |
| ------------ | ---------------------------------- |
| `schemas/*/` | `~/.local/share/openspec/schemas/` |
| `skills/*/`  | `~/.config/opencode/skills/`       |

**注意：sync.sh 不复制 `scripts/*.ts`**——scripts 随 `skills/omo-apply-change/` 同步到 `~/.config/opencode/skills/omo-apply-change/scripts/`,scripts 在那里被 OpenCode skill 调用。

选项：

```bash
scripts/sync.sh                       # 全部（schemas + skills）
scripts/sync.sh --schemas-only        # 只同步 schemas
scripts/sync.sh --skills-only         # 只同步 skills
scripts/sync.sh --lang zh             # __LANG_PLACEHOLDER__ 替换为中文提示
scripts/sync.sh --lang en             # 替换为英文（默认 = 删除占位符）
scripts/sync.sh --dry-run             # 预览
scripts/sync.sh --help                # 详细
```

部署完 **必须重启 OpenCode** 才生效。`__LANG_PLACEHOLDER__` 处理：中文替换为 `**语言**: 所有生成的文档必须使用中文。`；英文替换为 `**Language**: All generated documents MUST be written in English.`；默认删除该行。

## The 2 scripts

| 脚本                    | 作用                                                                                                                                       | 用法                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `inspect-apply.ts`      | 拉取 apply 阶段 change 上下文（8 字段精简 JSON：changeName/schemaName/planningHome/changeRoot/contextFiles/planFile/planName/instruction） | `inspect-apply.ts <change-name>`      |
| `sync-plan-to-tasks.ts` | `.omo/plans/<change>.md` → `openspec/changes/<change>/tasks.md` 镜像                                                                       | `sync-plan-to-tasks.ts <change-name>` |

**模块 + 脚本双身份**：`sync-plan-to-tasks.ts` 既是 CLI 脚本（直接运行读 argv 干活）也是 module（测试 import 3 个 export）。`import.meta.main` 保护：被 import 时只导出函数，不执行主流程。

**Oracle 验证上下文**不再走 tool：Oracle agent 通过 `openspec instructions apply` 的 `contextFiles` + 自己跑 `git diff --name-only HEAD` 拿变更文件（避免 Bun.spawn 跨运行时依赖）。

## OMO plan 9 章节（`.omo/plans/<name>.md`）

TL;DR / Context / Work Objectives / **Verification Strategy** / Execution Strategy / TODOs / **Final Verification Wave** / **Commit Strategy** / Success Criteria。

`## TODOs` 下用 `#### N. [ ] 标题`；每个 task 跟一组 `- **Field**: value` 字段。`### 6.1 Wave 1: 标题` 分波次。`## Final Verification Wave` 用 `### F1. [ ] 标题`（**用户手动验证，无 checkbox**）。

## Spec validation 硬规则（`schema.yaml` specs.instruction）

- Requirement 必须含大写 `MUST` 或 `SHALL`（**中文"必须"不通过 validate**）
- Scenario 用 4 个 `#`（`#### Scenario:`）
- 每个 requirement ≥ 1 scenario，含 WHEN/THEN
- 写完 specs 跑 `openspec validate <change-name>`

## 3 exports（`sync-plan-to-tasks.ts`）

`parseOmoPlan(content, changeName): OmoPlan` · `generateOpenSpecTasks(plan): string` · `syncPlanToTasksFile(planFilePath, changeRoot, changeName): { tasksContent, tasksFile }`

零 OpenCode 依赖，可独立 import。`syncPlanToTasksFile` 是纯 fs 函数（不依赖 openspec CLI），集成测试用它做 round-trip 验证。

## Format conversion: OMO plan ↔ OpenSpec tasks.md

| 维度   | OMO plan                                  | OpenSpec tasks.md                      |
| ------ | ----------------------------------------- | -------------------------------------- |
| 主章节 | `## TODOs` / `## Final Verification Wave` | `## Tasks`                             |
| Wave   | `### 6.1 Wave 1: 标题`                    | `### Wave 1: 标题`                     |
| 任务   | `#### 1. [ ] 标题`                        | `- [ ] 1.1 标题`                       |
| FVW    | `### F1. [ ] 标题`                        | `- 8.1 标题`（**无 checkbox**）        |
| 字段   | `- **Field**: value`                      | `      **Field**: value`（6 空格缩进） |

**单向同步**：plan → tasks.md。tasks.md 是 plan 镜像，**不要手动编辑**（会被下次同步覆盖）。`syncPlanToTasksFile` 幂等。

## Quality gates（spec-driven tasks 阶段）

1. **PHASE 1.2** Spec validation（强制）
2. **PHASE 2** AI 写 `.omo/plans/<name>.md`
3. **PHASE 3.1** Oracle/Momus 按 OMO 9 章节格式做结构 review（原 `omo_spec_check_plan` 11 项检查已合并到 review checklist）
4. **PHASE 3.2** Oracle + Momus 并行 review（Oracle 看 OMO 兼容性，Momus 给 OKAY/REJECT verdict）
5. **PHASE 3.4** Verdict 处理：🔴 BLOCKED → 修复重审（最多 3 轮，超出问用户）；🟡/⚪ → 问用户
6. **PHASE 4** `sync-plan-to-tasks.ts <change>` 镜像 plan → tasks.md
7. **apply Step 3** Oracle 验证 — 直接读 `openspec instructions apply` 的 `contextFiles` + 自己跑 `git diff`（不通过 tool/script）
8. **Fast Fail**（全局）：任何 task/tool/skill 调用失败 → 立即停，不重试/降级/跳过

agent 数量上限：`oracle` 可并行 · `momus` 每个 tasks 阶段 ≤ 1 次（与 oracle 并行）。

## Hard constraints

**Do NOT modify**：

- OMO 源码、内置 schema（本仓库只 override 自定义层）
- `schema.yaml` 的 `requires` / `generates` / `tracks`（定义依赖图）
- `design` artifact 是 mandatory（`tasks.requires: [specs, design]`）
- Plan file 不被 OpenSpec `detectCompleted()` track — 是 tasks instruction 的 side effect

**Anti-patterns**：

- ❌ 从 tasks.md 反向写回 plan
- ❌ 手动编辑 tasks.md（会被覆盖）
- ❌ 改 sync tool 让它支持双向同步
- ❌ apply skill 跳过 sync 步骤
- ❌ Schema 错误消息不带 `❌/⚠️/ℹ️` emoji

## Test + verify

```bash
bun test skills/omo-apply-change/scripts/__tests__/  # 5 文件 / 264 测试 (~0.5s)
openspec schema validate spec-driven              # schema 结构验证
openspec schema validate constitution             # 同上
bash scripts/sync.sh --dry-run                     # 预览部署
```

源文件 0 处 `as any`，0 处 `@ts-expect-error`（scripts 是纯 fs + OpenSpec CLI 调用，不需要 plugin 懒加载）。

## Reference repositories (`refs/`)

本地 12 个 git submodule —— 调研/借鉴/对比用，**不构建，不分发**。两类：

### 类别一：AI Coding Spec / SDD 工具

| 仓库                  | 定位                                                     | 与本仓库关系                                                      |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `OpenSpec/`           | 最轻量 AI-native spec 框架，schema.yaml 驱动 workflow    | **上游依赖**（本仓库是它的配置层）                                |
| `spec-kit/`           | GitHub 官方 SDD 工具包，"规范可执行"，Python             | **核心参考**（constitution + 强制 clarify）                       |
| `BMAD-METHOD/`        | 全生命周期 AI 敏捷，12+ 命名 Agent 协作                  | 设计灵感（多 Agent 编排，Oracle + Momus 受其启发）                |
| `gsd-core/`           | 跨 10+ AI agent 运行时的 SDD + context engineering       | 设计灵感（Phase loop + 跨运行时 sync.sh）                         |
| `gstack/`             | Garry Tan 的 AI 软件工厂，23+ specialist + 真实浏览器 QA | 设计灵感（多角色 review pipeline → quality gates）                |
| `superpowers/`        | 纯 Markdown + JSON hooks，skills **自动触发**            | 设计灵感（auto-trigger hooks + subagent-driven）                  |
| `claude-task-master/` | PRD → `tasks.json` 的 AI 任务管理（MCP server）          | 同类参考（思路相似但层级不同：平面 vs 多层 artifact）             |
| `flow-kit/`           | 纯 Markdown 工作流方法论，零运行时，artifact-gated       | 近亲参考（相同 `.specs/` 哲学；无 OpenCode tool/OMO plan/script） |

### 类别二：AI 工具类（OpenCode + OMO 生态）

| 仓库                       | 定位                                                        | 与本仓库关系                                           |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `opencode/`                | 终端 AI 编程 Agent 平台，TS + Effect 4.0 + Bun，25 packages | **部署目标平台**（`tools/` 加载到 `.opencode/tools/`） |
| `oh-my-openagent/`         | OpenCode 增强插件，11 agent + 55 hooks + Team Mode          | **核心依赖**（`.omo/plans/*.md` 9 章节由 OMO 定义）    |
| `oh-my-openagent-toolkit/` | OMO 本地化操作层，45 个领域 skill（MIT）                    | 间接参考（`.opencode/skills/` 组织方式）               |
| `anthropics-skills/`       | Anthropic 官方 skills + SKILL.md 格式规范                   | **格式标准来源**（11 个 OpenSpec skill 按此格式编写）  |

## Git

- Remote: `git@github.com:syllr/openspec-omo-bridge.git` · Branch: `main`
- AI **禁止** 自动 commit/push，必须用户显式要求 `/git-commit` 或 `commit`（`git-commit-block` 规则）

## Constitution

<!-- constitution-start -->
<!-- constitution-end -->
