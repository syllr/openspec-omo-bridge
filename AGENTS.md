# openspec-omo-bridge

OpenSpec `spec-driven` + `constitution` 自定义 schema + 3 个 OpenCode tool，把 OpenSpec 工作流桥接到 oh-my-openagent (OMO) plan 执行。

**这是一个配置仓库**，不是代码项目。AI 在 OMO 里跑 OpenSpec 工作流时用这些 schema/tool。

## Key files

| Path                           | Purpose                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `schemas/spec-driven/`         | 主 schema：4 artifacts（proposal → design → specs → tasks） + apply 阶段。860 行 YAML。                              |
| `schemas/constitution/`        | 简化 schema：2 artifacts（scan → design） + apply 阶段。管 project 级元数据。                                        |
| `schemas/*/templates/`         | 各 artifact 的 markdown 模板。                                                                                       |
| `tools/omo-spec.ts`            | 单文件 3 tool：`sync_tasks_from_plan` / `validate_omo_plan` / `prepare_verification_context` + 4 纯函数 + 类型定义。 |
| `tools/__tests__/`             | 6 个测试文件，308 测试。`bun test tools/__tests__/` 跑全部。                                                         |
| `scripts/sync.sh`              | 部署：`tools/*.ts` → `~/.config/opencode/tools/`，`schemas/*/` → `~/.local/share/openspec/schemas/`。                |
| `.opencode/opencode.json`      | 项目级 OpenCode 权限：允许 `external_directory` + `read` 跨目录。                                                    |
| `.opencode/skills/openspec-*/` | 11 个 OpenSpec skill，桥接到本仓库的 schema/tool。                                                                   |

## Workflow at a glance

```
proposal → design ──┬──► specs ──┐
                    │            ├──► tasks ──► apply (Oracle verify) ──► archive
                    └─────────────┘
                (constitution schema: scan → design → apply，无 tasks/critic；2 artifacts + apply 阶段)
```

`tasks.instruction` 在 PHASE 3 让 AI 直接写 `.omo/plans/<name>.md`（OMO 格式 9 章节：TL;DR / Context / Work Objectives / Verification Strategy / Execution Strategy / TODOs / Final Verification Wave / Commit Strategy / Success Criteria）。constitution schema 用 7 章节（跳过 Verification Strategy + Commit Strategy）。

## Deploy

```bash
scripts/sync.sh                       # 部署全部（tools + schemas，无语言占位符）
scripts/sync.sh --lang zh             # schema 里 __LANG_PLACEHOLDER__ 替换为中文提示
scripts/sync.sh --lang en             # 替换为英文
scripts/sync.sh --tools-only          # 只同步 tools
scripts/sync.sh --schemas-only        # 只同步 schemas
scripts/sync.sh --dry-run             # 预览
```

部署完 **必须重启 OpenCode** 才生效。`sync.sh` 跳过 `*-core.ts` / `*-test.ts` / `*-helper.ts` / `*-util.ts` / `*-types.ts` 后缀的辅助文件，只复制 tool 入口。

## The 3 tools

| Tool 名                                 | 作用                                                      | 参数                                           |
| --------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| `omo_spec_sync_tasks_from_plan`         | 把 `.omo/plans/*.md` 镜像成 `openspec/changes/*/tasks.md` | `{ change_name?: string }` — 传单个 / 不传批量 |
| `omo_spec_validate_omo_plan`            | 验证 plan 是否符合 OMO 兼容性（11 项检查）                | `{ change_name: string, paths: string[] }`     |
| `omo_spec_prepare_verification_context` | 组装实现验证上下文（artifacts + 5 维度 + verdict 规则）   | `{ change_name: string, paths: string[] }`     |

**Tool 命名规则**：`omo_spec_<exportname>`（`<file>_<exportname>`，hyphen → underscore）。`omo-spec.ts` 文件名 → tool 名前缀 `omo_spec_`。

**所有 3 tool 返回 `ToolResult` 结构化对象**（OpenCode plugin `string | { title?, output, metadata? }`）：

```ts
// sync single success
{ title: "sync_tasks_from_plan: my-change",
  output: "✅ my-change: 同步完成（2 tasks, 0 ✅, 1 waves）\n   /abs/path/tasks.md",
  metadata: { mode: "single", changeName, total, completed, waves, tasksPath } }

// sync batch
{ title: "sync_tasks_from_plan: batch (3 synced, 1 skipped)",
  output: "✅ 批量同步完成：...",
  metadata: { mode: "batch", synced: [...], skipped: [...] } }

// validate
{ title: "validate_omo_plan: my-change (11/11)",
  output: "✅ plan 结构检查通过（11/11 项全部通过）",
  metadata: { changeName, valid, passedChecks, totalChecks, results: OmoPlanCheck[] } }

// prepare ctx
{ title: "prepare_verification_context: my-change",
  output: "=== 实现验证上下文已准备 ===\n...",
  metadata: { changeName, artifacts, dimensions, verdictRules } }
```

抛错统一格式 `❌ 标题\n   详情\n   修复：建议`。`output` 给 LLM 看，`metadata` 给程序消费。

**`paths` 参数是 OpenCode read 工具的约定**（必须包含 tool 要读的文件路径，否则权限系统会拦截）。AI 必须传包含 plan/artifact 路径的绝对路径数组。

## 4 pure functions (可独立 import，零 OpenCode 依赖)

`parseOmoPlan(content, changeName): OmoPlan` · `generateOpenSpecTasks(plan): string` · `validateOmoPlan(content, changeName): OmoPlanValidation` · `prepareVerificationContext(changeName, artifacts, changedFiles): VerificationContext`

测试用 `import { parseOmoPlan, generateOpenSpecTasks, validateOmoPlan } from "../omo-spec"` 复用纯函数。`prepare_verification_context` tool 的 `metadata` 给 Oracle agent 用，Oracle **自己**跑 `git diff --name-only HEAD` 拿变更文件（不通过 tool，避免 Bun.spawn 跨运行时）。

## 2 public constants (Oracle 5 维度验证用)

`VERIFICATION_DIMENSIONS`: 5 维度检查清单（Spec 合规性 / Design 对齐 / Proposal 范围 / Task 完成度 / 非功能性合规性）。`VERDICT_RULES`: BLOCKED / CONDITIONAL / 注意 三类判定规则的语义边界。这两个常量被 `prepare_verification_context` tool 的 `metadata` 透传给 Oracle，Oracle agent 直接 `import` 用，不要重新定义。

## Plugin 懒加载

`omo-spec.ts` 用 `require("@opencode-ai/plugin")` + `try/catch`：

- **生产**（OpenCode 加载 tool）：plugin 存在，用真实 `tool()` helper + chainable schema
- **测试**（本地 `bun test`）：plugin 不在，chainable Proxy stub 兜底（`tool.schema.string().min(1).describe(...)` 都能调，全返回 proxy）

这是为什么测试里大量 `(tool as any).execute(...)` — 绕过 stub 的 `unknown` 返回类型。

## Format conversion: OMO plan ↔ OpenSpec tasks.md

| 维度   | OMO plan                                  | OpenSpec tasks.md                         |
| ------ | ----------------------------------------- | ----------------------------------------- |
| 主章节 | `## TODOs` / `## Final Verification Wave` | `## Tasks`                                |
| Wave   | `### 6.1 Wave 1: 标题`                    | `### Wave 1: 标题`                        |
| 任务   | `#### 1. [ ] 标题`                        | `- [ ] 1.1 标题`                          |
| FVW    | `### F1. [ ] 标题`                        | `- [ ] 8.1 标题`（FVW 作为最后一个 Wave） |
| 字段   | `- **Field**: value`                      | `      **Field**: value`（6 空格缩进）    |

**单向同步**：plan → tasks.md。tasks.md 是 plan 的镜像，**不要手动编辑**（会被下次同步覆盖）。`sync_tasks_from_plan` 幂等，plan 改后重跑即可。

## Spec validation rules

`schema.yaml` 的 specs.instruction 内含 `openspec validate` 规则：

- Requirement 必须含大写 `MUST` 或 `SHALL`（**中文 "必须" 不会通过 validate**）
- Scenario 用 4 个 `#`（`#### Scenario:`）
- 每个 requirement ≥ 1 scenario，含 WHEN/THEN
- AI 写完 specs 后必须跑 `openspec validate <change-name>`

## Quality gates (spec-driven tasks 阶段)

1. **PHASE 1.2** Spec validation（强制）
2. **PHASE 2** Oracle gap analysis（1 次）
3. **PHASE 3** Metis plan consultation（1 次）+ AI 写 `.omo/plans/<name>.md`
4. **PHASE 4.1** `omo_spec_validate_omo_plan`（11 项结构检查）
5. **PHASE 4.2** Oracle + Momus 并行 review（Oracle 看 OMO 兼容性，Momus 给 OKAY/REJECT verdict）
6. **PHASE 4.4** Verdict 处理：🔴 BLOCKED → 修复重审（最多 3 轮，超出问用户接受风险/手动修/停）；🟡/⚪ → 问用户
7. **PHASE 5** `omo_spec_sync_tasks_from_plan` batch 镜像 plan → tasks.md
8. **apply Step 3** `omo_spec_prepare_verification_context` 拿 Oracle 验证上下文
9. **Fast Fail**（全局）：任何 task/tool/skill 调用失败 → 立即停，不重试/降级/跳过

agent 数量上限：`oracle` 可并行 · `metis` 每个 tasks 阶段 ≤ 1 次 · `momus` 每个 tasks 阶段 ≤ 1 次（与 oracle 并行）。

## Architecture constraints (do NOT modify)

- **OMO 源码、内置 schema**：不修改，本仓库只 override 自定义层
- **schema.yaml 的 `requires` / `generates` / `tracks`**：不修改，定义依赖图
- **`design` artifact 是 mandatory**（`tasks.requires: [specs, design]`）
- **Plan file 不被 OpenSpec `detectCompleted()` track** — 是 tasks instruction 的 side effect

## Anti-patterns (sync / edit)

- ❌ 从 tasks.md 反向写回 plan
- ❌ 手动编辑 tasks.md（会被覆盖）
- ❌ 改 sync tool 让它支持双向同步
- ❌ apply skill 跳过 sync 步骤
- ❌ Schema 错误消息不带 `❌/⚠️/ℹ️` emoji

## Test + verify

```bash
bun test tools/__tests__/                          # 跑全部 308 个测试 (~120ms)
openspec schema validate spec-driven              # schema 结构验证
openspec schema validate constitution             # 同上
bash scripts/sync.sh                               # 部署到 OpenCode/OpenSpec 全局目录
```

源文件 0 处 `as any`（测试里 29 处是绕过 stub type 的预期用法），1 处 `@ts-expect-error`（plugin 懒加载 require）。

## Git

- Remote: `git@github.com:syllr/openspec-omo-bridge.git` · Branch: `main`
- AI **禁止** 自动 commit/push，必须用户显式要求 `/git-commit` 或 `commit`（`git-commit-block` 规则）

## Constitution

<!-- constitution-start -->
<!-- constitution-end -->
