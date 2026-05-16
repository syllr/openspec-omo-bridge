## Context

当前 `spec-driven` schema 处理的是"每次变更"的流程（proposal → specs → design → tasks → critic → apply），但缺少项目层面的元数据管理——项目宪法（技术栈、编码规范、架构约束、测试规范等）。

宪法不属于某一次 change，而是项目始终存在的元数据。Spec Kit 有 `/speckit.constitution`、GSD 有 `/gsd-new-project`，它们都是独立于变更流程的一步。我们的 schema 体系也需要这个能力。

## Goals / Non-Goals

**Goals:**

- 新增一个独立的 `constitution` schema，与新项目和已有项目兼容
- 五步流程：scan → design → tasks → critic → apply，复用 spec-driven 的 critic 和 apply 机制
- scan 和 design 阶段使用多 agent 并行调研（librarian 集群）深入分析技术栈
- 最终产出 AGENTS.md + skill 文件（.opencode/skills/constitution/）
- 借鉴 GSD、Spec Kit、Harmony 的最佳实践

**Non-Goals:**

- 不修改 `spec-driven` schema 的现有 artifact 链
- 不涉及测试规范的具体内容（那是宪法模板的事）
- 不处理项目初始化之外的功能（如依赖管理、CI 配置）

## Decisions

### Decision 1：独立 schema，但复用 critic + apply 机制

宪法流程不是变更管理，不需要 proposal → specs 这样的需求定义阶段。但 critic（Momus 审查 + 质量门禁）和 apply（eager sync + 一致性验证）是 spec-driven 的成熟机制，应当复用而非重造。作为独立的 schema：

```bash
openspec-ff-change --schema constitution
```

**Rationale**：

- 宪法是项目层面的元数据，不是一次 feature change
- 独立 schema 可以自定义 scan 和 design 阶段的复杂流程
- 复用 critic + apply 机制，避免重复实现质量门禁和同步协议
- 不影响现有 spec-driven 流程，零侵入

**Alternatives Considered**：

- 在 spec-driven 中添加 constitution artifact：需要修改现有 schema，宪法不属于变更流程
- 自己实现 critic 和 apply：重复造轮子，直接复用更合理
- 单独写一个 CLI 工具：太重，应该复用 openspec 的 schema 机制

### Decision 2：五步 artifact 链（scan → design → tasks → critic → apply）

宪法 schema 复用 spec-driven 的 critic 和 apply 机制，但自定义 scan 和 design 两个前置阶段。完整链为：

| 步骤 | artifact | 中间产物                               | 说明                                                                                                          |
| ---- | -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1    | `scan`   | `scan.md`                              | 技术栈扫描 + 多 agent 并行调研 + 与用户商讨技术选型                                                           |
| 2    | `design` | `constitution-design.md`               | 基于确定的技术栈，多 agent 调研最佳实践，产出 reference 文档                                                  |
| 3    | `tasks`  | `tasks.md`                             | 简单的执行计划（修改 AGENTS.md + 创建/更新 constitution skill）                                               |
| 4    | `critic` | `critic.md`                            | 复制 spec-driven 的 critic.instruction 并适配（去掉 validate specs 步骤，质量门禁改为检查 constitution 产出） |
| 5    | `apply`  | 写入 AGENTS.md + SKILL.md + references | 复制 spec-driven 的 apply.instruction 并适配（改为写入 AGENTS.md + skill 文件，保留 eager sync + diff 流程）  |

**Rationale**：

- critic + apply 是 spec-driven 已验证的成熟机制，直接复用减少实现风险
- scan 和 design 是宪法特有的复杂阶段，需要自定义的调研和工作流
- tasks 阶段极其简单（仅 2 项任务），不需要 design → tasks 之间的复杂转换

#### scan 阶段：技术栈分析 + 多 agent 并行调研

scan 是最复杂的阶段，根据项目状态分两种路径：

**已有项目（有代码仓库）**：

```
1. AI 读取配置文件（package.json, go.mod, pyproject.toml 等），初步整理当前技术栈
2. 使用 /openspec-explore 与用户对话，商讨：
   - 当前技术栈是否满足需求
   - 是否需要引入新的技术栈
   - 是否需要升级某些依赖
3. 确定需要深入调研的方向后，并发启动 3~5 个 librarian agent（类似线程池）：
   - 每个 agent 负责一个技术方向（如前端框架选型、后端语言选择、数据库选择等）
   - 各 agent 独立调研，输出技术对比报告
4. 汇总调研结果，形成技术栈决策
```

**空项目（新项目初始化）**：

```
1. 主动询问用户需求：项目类型、团队规模、部署方式等
2. 根据用户需求给出技术选型建议
3. 对用户不确定的方向，启动 3~5 个 librarian agent 并行调研提供参考
4. 最终用户确认完整技术栈
```

**关于 `librarian` 并发模式**：借鉴 GSD 的多路并行研究员模式，scan 阶段维护一个 3~5 个 librarian agent 的"线程池"。每个 agent 独立搜索和学习一个技术方向。调研结果汇总到 `scan.md` 中。

**scan.instruction 分层结构**（4 个 Phase）：

```
Phase 1: 项目检测与配置文件解析
  - 检测 package.json / go.mod / pyproject.toml / Cargo.toml 等
  - 通过 Glob 和 Grep 分析项目结构、构建工具、测试框架
  - 区分已有项目和空项目

Phase 2: 用户对话（/openspec-explore）
  - 展示当前技术栈分析结果
  - 商讨是否需要引入新技术或升级现有依赖

Phase 3: 并行调研（3~5 个 librarian agent）
  - 每个 agent 负责一个技术方向
  - 独立搜索、对比、输出技术报告

Phase 4: 汇总
  - 合并调研结果
  - 输出结构化 scan.md
```

产出：`scan.md` — 结构化技术栈分析报告（含决策记录和备选方案）

#### design 阶段：基于确定的技术栈，多 agent 调研最佳实践

技术栈已在 scan 阶段确定，design 阶段聚焦于**每个技术选型的最佳实践和编码规范**：

```
1. 根据 scan.md 中确定的技术栈列表，并发启动多个 librarian agent：
   - 每个 agent 负责一个技术栈（如 React 最佳实践、Go 项目布局、PostgreSQL 设计模式等）
   - 深入调研官方文档、社区标准、常见陷阱
2. 用户逐一审查调研结果，确认无问题
3. 使用 /summarize-research 命令将调研结论整理成 structured reference 文档：
   - coding-standards/naming.md
   - coding-standards/imports.md
   - testing/unit-testing.md
   - architecture.md
   - gotchas.md
   等，按宪法目录结构存放
4. 通过 question tool 询问用户：是否要把宪法与现有代码做同步（扫描代码检查不符合宪法的地方并标记修复）？
   - 如果用户选择同步，则在 spec.md 和 design.md 中添加代码同步的逻辑，tasks 阶段额外生成"修复现有代码违规"的 task
   - 如果用户选择不同步，直接跳过
   - 此步骤非必做，由用户决策触发
5. 汇总到 constitution-design.md 中
```

产出：`constitution-design.md`（含完整的宪法结构设计和已经确认的参考文档内容）

#### tasks 阶段：简约执行计划

task 只有两部分：

1. 修改或新增 `AGENTS.md` 的 `## Constitution` 章节
2. 修改或新增 `.opencode/skills/constitution/` 下的 skill 文件和 references

如果用户选择"扫描现有代码是否合规"，则额外增加：3. 修复项目中不符合宪法规范的代码

**Rationale**：

- 宪法的主要产出是文件写入，没有复杂的编码工作
- 简化 task 数量，避免过度拆分

**Alternatives Considered**：

- 单步 design → apply：缺少 critic 的质量保障
- generate → critic → apply 三步：generate 和 design 职责重叠
- 直接 3 步（scan → design → generate）：generate 内部的 critic 和 apply 逻辑需要手写，不如复用现有机制

### Decision 3：OpenCode skill 格式作为宪法载体

最终宪法使用 OpenCode 的 SKILL.md 格式存储，遵循官方 frontmatter 规范：

```yaml
---
name: constitution
description: 项目编码规范、架构约束和测试标准
---
```

**Rationale**：

- OpenCode 原生支持 SKILL.md 的自动发现和按需加载
- AI 根据 description 自动触发，无需用户手动调用
- 兼容 Claude Code 的 `.claude/skills/` 路径

**Alternatives Considered**：

- 直接写入 AGENTS.md：AGENTS.md 是始终加载的，token 预算有限，不适合存放详细规范
- 自定义格式：需要额外工具支持，SKILL.md 是标准格式

### Decision 4：多级知识索引（AGENTS.md + skills + references）

借鉴 Harmony 的分层结构和 OpenCode 的 references 模式：

```
AGENTS.md → 高层索引（~1,000 tokens，始终加载）
.opencode/skills/constitution/SKILL.md → 详细规范（按需加载）
.opencode/skills/constitution/references/*.md → 深度参考（引用时加载）
```

**Rationale**：

- AGENTS.md 保持精简，只包含技术栈、项目结构、常用命令
- 详细规范按领域拆分到 skill 的 references 子目录
- AI 基于 description 自动加载，不需要用户操作

**目录结构**：单 module 平铺，多 module 按 module 分目录。Skill 是整包加载的，如果不同 module 的规则混在一起，AI 改前端代码时也会加载后端和模型服务的上下文，浪费 token。因此按 module 拆分，AI 只加载当前工作 module 的规则。

**单 module 项目**（平铺）：

```
.opencode/skills/constitution/
├── SKILL.md
└── references/
    ├── tech-stack.md
    ├── project-structure.md
    ├── coding-standards/
    │   ├── naming.md
    │   ├── imports.md
    │   └── error-handling.md
    ├── testing/
    │   ├── unit-testing.md
    │   ├── e2e-testing.md
    │   └── mocking.md
    ├── architecture.md
    └── gotchas.md
```

**多 module 大仓**（按 module 分目录，每 module 自包含）：

```
.opencode/skills/constitution/
├── SKILL.md
└── references/
    ├── user-frontend/                    ← 前端 module
    │   ├── tech-stack.md
    │   ├── project-structure.md
    │   ├── coding-standards/
    │   │   ├── naming.md
    │   │   ├── imports.md
    │   │   └── error-handling.md
    │   ├── testing/
    │   │   ├── unit-testing.md
    │   │   ├── e2e-testing.md
    │   │   └── mocking.md
    │   └── gotchas.md
    ├── admin-frontend/                   ← 另一个前端 module
    │   └── ...（同上结构）
    ├── backend-api/                      ← 后端 module
    │   └── ...（同上结构）
    ├── model-server/                     ← 模型服务 module
    │   └── ...（同上结构）
    └── architecture.md                   ← 跨 module 架构约束（顶层共享）
```

每个 module 目录自包含一套完整规范，AI 在修改某 module 时只加载对应目录的文件。跨 module 的架构约束（如依赖方向、通信协议）放在顶层 `architecture.md`。

### Decision 5：可重入设计（固定命名 + 章节锚点）

宪法 schema 需要可重入（re-entrant）——用户可以在任何时候重新运行，用于更新宪法。为此必须满足：

1. **固定输出路径**：所有宪法文件使用固定路径和命名，不包含时间戳或随机标识
   - `AGENTS.md` 中的宪法章节使用固定标题（如 `## Constitution`）
   - skill 文件路径固定：`.opencode/skills/constitution/SKILL.md`
   - references 文件路径固定：`.opencode/skills/constitution/references/*.md`

2. **Init vs Update 检测逻辑**（三级检测）：apply 阶段通过以下方式判断：
   - 同时检查 `AGENTS.md` 的 `## Constitution` 章节和 `.opencode/skills/constitution/SKILL.md` 的存在性
   - **两者都存在** → **update 模式**（diff 原内容，提示用户确认保留/替换的部分）
   - **两者都不存在** → **init 模式**（直接生成全部文件）
   - **仅部分存在**（如 SKILL.md 存在但 AGENTS.md 无章节，或反之）→ **incomplete 模式**（提示用户存在不一致状态，询问：覆盖/补齐缺失/放弃）

3. **用户主导的更新**：技术栈升级不是自动触发的。用户主动重新运行 `openspec new change --schema constitution <name>`（可使用新名称，如 `constitution-update-2026`），scan 和 design 重新执行，apply 自动检测项目级文件（AGENTS.md + SKILL.md）判断 init/update 模式——**change 目录是新的，但检测是对项目级文件的，两者不冲突**。

4. **AGENTS.md 合并策略**：AGENTS.md 已存在时：
   - 已有 `## Constitution` 章节且进入 update 模式 → diff 后由用户选择保留/替换
   - 已有 AGENTS.md 但无 `## Constitution` 章节 → **追加**到末尾（不覆盖已有内容）
   - AGENTS.md 不存在 → 按模板生成完整文件

**Rationale**：

- 技术栈升级应该由用户决策，不是 AI 自动行为
- 固定命名使 apply 可检测"哪些文件已存在"，从而区分 init/update
- diff 机制保护用户自定义内容不被覆盖
- 与现有 spec-driven 的 apply 机制一致（eager sync + diff 验证）

**Alternatives Considered**：

- 在 spec-driven 中加"更新宪法"的专门阶段：过度复杂，可重入设计更简洁
- 版本化路径（如 `constitution-v2/`）：增加复杂度，用户无法感知切换

### Decision 6：Critic 生成的 plan 文件格式

spec-driven 的 critic 生成 `.sisyphus/plans/<name>.md`（9 节结构）并被 apply 的 `/start-work` 解析。constitution 的 critic 也需要生成 plan 文件，但内容需要适配：

| 保留节                  | 适配方式                                                        |
| ----------------------- | --------------------------------------------------------------- |
| TL;DR                   | 从 constitution-design.md 提取摘要                              |
| Context                 | 引用 scan.md（技术栈分析）和 constitution-design.md（宪法设计） |
| Work Objectives         | 简单：修改 AGENTS.md + 创建/更新 constitution skill             |
| Execution Strategy      | 简约版（只有 2~3 个 task，且是文件操作而非编码）                |
| Tasks                   | 映射 tasks.md 的 checkbox（2 项强制 + 1 项可选）                |
| Final Verification Wave | 检查 AGENTS.md 章节 + SKILL.md frontmatter + references 存在性  |
| Success Criteria        | 适用（标准检查清单，无需特殊适配）                              |

| 跳过节                | 原因                                     |
| --------------------- | ---------------------------------------- |
| Verification Strategy | spec-driven 用于代码变更验证，宪法无编码 |
| Commit Strategy       | 宪法不涉及代码提交                       |

**Rationale**：

- 复用 spec-driven 的 plan 格式框架，减少 critic instruction 的改动量
- 参照 spec-driven 的 `/start-work` 解析协议，确保 apply 阶段的兼容性
- 简化非必要节（Verification Strategy、Commit Strategy），匹配宪法的"文件写入"特性

## Risks / Trade-offs

| Risk                                           | Mitigation                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| 用户已有 AGENTS.md，宪法 schema 生成时可能覆盖 | apply 阶段先检查 AGENTS.md 是否存在，存在则提示用户选择覆盖或合并 |
| 宪法更新时用户自定义内容被覆盖                 | 更新流程先 diff 再问用户哪些部分保留                              |
| 宪法过于庞大，AGENTS.md token 超限             | AGENTS.md 只保留索引（~1,000 tokens），详情走 skill               |

## Migration Plan

1. 创建 `schemas/constitution/schema.yaml`，定义五个 artifact（scan → design → tasks → critic → apply）
   - `requires`：scan 为空，design 依赖 scan，tasks 依赖 design，critic 依赖 tasks，apply 依赖 critic
   - critic.instruction：复制 spec-driven 的 critic.instruction 并适配——去掉 `openspec validate` 步骤（constitution 没有 specs），质量门禁改为检查 constitution 产出（frontmatter、章节锚点、references 存在性）
   - apply.instruction：复制 spec-driven 的 apply.instruction 并适配——写入目标改为 AGENTS.md + skill 文件而非代码文件，保留 eager sync + diff 一致性验证
   - `apply.tracks: tasks.md` 与 spec-driven 保持一致，eager sync 的 diff 检查范围改为 AGENTS.md + skill 文件写入
2. 创建五个模板文件（参考 spec-driven 的骨架风格，使用占位符不做预填充）：
   - `templates/scan.md` — 提示词含：配置文件白名单、多 agent 并发调研策略、openspec-explore 交互流程
   - `templates/constitution-design.md` — 提示词含：多 agent 并发调研最佳实践、summarize-research 指令、question tool 询问代码同步
   - `templates/tasks.md` — constitution 专用版，继承 spec-driven 的 Wave 分组 + checkbox 结构，适配"2 项基础 + 1 项可选"场景
   - `templates/critic.md` — constitution 专用版，保留 5 路 Momus 审查报告结构，去掉 specs validation 引用
3. scan.instruction 需实现：
   - 已有项目 vs 空项目两条路径
   - 3~5 个 librarian agent 并发调研 + 汇总
4. design.instruction 需实现：
   - 基于确认的技术栈并发调研最佳实践
   - 调用 `/summarize-research` 生成 reference 文档
   - 使用 question tool 询问用户是否同步宪法与代码（可选）
5. tasks.instruction 需实现：
   - 基础任务：修改 AGENTS.md + 创建/更新 constitution skill
   - 可选任务：修复现有代码违规（如果用户在 design 阶段选择了同步）
6. 测试：手动跑 `openspec-ff-change --schema constitution` 验证 init 和 update 两种路径（本 change 完成后）

## Open Questions

- scan 阶段需要读哪些白名单文件？（如 `package.json`、`go.mod`、`pyproject.toml`、`Cargo.toml` 等）
- 是否需要在 `spec-driven` schema 中也加入一个"快速宪法初始化"的入口命令？
