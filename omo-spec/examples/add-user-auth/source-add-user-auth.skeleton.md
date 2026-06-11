# omo-spec Source Plan Template — spec-driven schema

> 本文件是 `gen-source-plan.ts` 脚本读取的骨架模板,用于生成 `.omo/plans/source-<change-name>.md`。
> 脚本只替换 `{{...}}` 占位符(由 SCHEMA 自动填入),不动 `<!-- LLM_FILL: ... -->` 标记(由 LLM 填充)。
>
> **LLM 填充规则**:
>
> - 看到 `<!-- LLM_FILL: 描述 -->` 标记 → 用对应的 markdown 内容替换整行注释
> - 看到 `<!-- TODO_NN: 描述 -->` 标记 → 视为业务内容占位符,逐个替换
> - **绝不**删除或修改任何 `{{...}}` 占位符(脚本会报错)
> - **绝不**展开第 7/8 章的静态嵌入内容(已由脚本嵌入完毕,LLM 应当引用而非重写)

---

<!--
  ═══════════════════════════════════════════════════════════════════
  章节结构说明
  ═══════════════════════════════════════════════════════════════════
  - 第 1-5 章: LLM 填充业务内容(基于对话上下文)
  - 第 6 章:   脚本按 schema.artifacts 顺序生成 Wave 块(LLM 不动)
  - 第 7 章:   脚本嵌入 schema.yaml 每个 artifact 的 instruction 全文
  - 第 8 章:   脚本嵌入 templates/ 每个 artifact 的 template 全文
  - 第 9 章:   LLM 填充"如何把 artifacts 翻译成 compile plan"的指引
-->

---

mode: source
generator: omo-spec
schema: spec-driven
changeName: add-user-auth
generatedAt: "2026-06-11"
targetArtifacts:
  - proposal.md
  - design.md
  - specs/**/*.md
  - tasks.md
compilePlanOutput: .omo/plans/add-user-auth.md
reviewCheckpointPolicy: per-wave-pause

---

# omo-spec Source Plan: add-user-auth

> **本文件由 `omo-spec-source-plan` skill 生成,跑 `/start-work source-add-user-auth` 执行。**
> 生成器版本:omo-spec 1.0 | schema:spec-driven
> 阅读时长:预计 3-5 分钟(全部 9 章节)| 执行时长:预计 10-30 分钟(每个 Wave 1 个 artifact)

---

## 1. TL;DR

<!-- LLM_FILL: 用 1 句话概述本次变更做什么(对最终用户/开发者的价值) -->

_(待 LLM 填充)_

---

## 2. Context

<!-- LLM_FILL: 2-3 句话说明背景:为什么做这个变更、当前痛点或机会在哪 -->

_(待 LLM 填充)_

---

## 3. Work Objectives

<!-- LLM_FILL: 列出本次变更的 Must Have / Must NOT Have -->

- **Must Have**:
  - _(待 LLM 填充:本次必须达成的目标)_
- **Must NOT Have**:
  - _(待 LLM 填充:本次明确不在范围内的事项)_

---

## 4. Verification Strategy

<!-- LLM_FILL: 描述如何验证 4 个 OpenSpec artifacts 生成正确 -->

- **Artifact 结构验证**:
  - 每个 artifact 包含模板必需的 sections(详见第 7/8 章)
  - `openspec validate add-user-auth` 通过(specs 阶段后)
- **Compile Plan 验证**:
  - 满足 OMO 9 章节格式(第 9 章描述生成规则)
- **Review Checkpoint**:
  - 每个 Wave 完成后停下让用户 review(per-wave-pause policy)

---

## 5. Execution Strategy

<!-- LLM_FILL: 关键路径 / 并发上限 / 顺序约束 -->

- **Critical Path**: proposal → design → specs → tasks → compile-plan(严格顺序)
- **Max Concurrent**: 1(spec-driven 4 个 artifact 之间存在硬依赖)
- **Sequential Constraints**:
  - Wave 1 (proposal) 必须最先完成
  - Wave 2 (design) 依赖 Wave 1 输出
  - Wave 3 (specs) 依赖 Wave 1 + Wave 2 输出
  - Wave 4 (tasks placeholder + compile plan) 依赖 Wave 1-3 输出
- **Hard Failure Rule**:
  - 任何 `task()` / `tool()` / `skill()` 调用失败 → 立即停止,不得降级/重试/跳过/自行替代执行
  - 任何 LLM 内容理解错误导致 artifact 模板结构缺失 → 停下问用户,不擅自重写

---

## 6. TODOs

> **本章节由脚本按 schema.artifacts 顺序自动生成,LLM 不修改。**
> 每个 Wave 对应 schema 中的一个 artifact,Wave 内仅含 1 个 task。
> task 的 **Embedded Reference** 字段显式指向第 7/8 章的静态嵌入内容——LLM 在执行 task 时必须读这些章节作为行为约束。

### 6.1 Wave 1: proposal

#### 1. [ ] 生成 proposal artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.1 节嵌入的 `proposal.instruction` 行为约束执行
  3. 按第 8.1 节嵌入的 `proposal template` 结构填字段
  4. 写入 OpenSpec artifact 文件
- **Output Path**: `openspec/changes/<change-name>/proposal.md`
- **Embedded Reference**: 第 7.1 节(`proposal.instruction` 全文)+ 第 8.1 节(`proposal template` 全文)
- **Acceptance Criteria**:
  - 文件存在
  - 包含模板必需 sections(详见第 8.1 节)
  - `openspec validate <change-name>` 通过(若 schema 含 validate 步骤)
- **Forbidden**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Review Checkpoint**: 完成本 Wave 后停下,用 question 工具问用户是否继续
- **Agent Profile**: `category="unspecified-low"` (内容生成,非复杂逻辑)

---

### 6.2 Wave 2: design

#### 2. [ ] 生成 design artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.2 节嵌入的 `design.instruction` 行为约束执行
  3. 按第 8.2 节嵌入的 `design template` 结构填字段
  4. 写入 OpenSpec artifact 文件
- **Output Path**: `openspec/changes/<change-name>/design.md`
- **Embedded Reference**: 第 7.2 节(`design.instruction` 全文)+ 第 8.2 节(`design template` 全文)
- **Acceptance Criteria**:
  - 文件存在
  - 包含模板必需 sections(详见第 8.2 节)
  - `openspec validate <change-name>` 通过(若 schema 含 validate 步骤)
- **Forbidden**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Review Checkpoint**: 完成本 Wave 后停下,用 question 工具问用户是否继续
- **Agent Profile**: `category="unspecified-low"` (内容生成,非复杂逻辑)

---

### 6.3 Wave 3: specs

#### 3. [ ] 生成 specs artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.3 节嵌入的 `specs.instruction` 行为约束执行
  3. 按第 8.3 节嵌入的 `specs template` 结构填字段
  4. **若 artifact.id = specs** —— 为 proposal 的每个 Capability 创建一个 spec 文件
  5. 写入 OpenSpec artifact 文件
- **Output Path**: `openspec/changes/<change-name>/specs/**/*.md`(每个 capability 一个文件)
- **Embedded Reference**: 第 7.3 节(`specs.instruction` 全文)+ 第 8.3 节(`specs template` 全文)
- **Acceptance Criteria**:
  - 文件存在
  - 包含模板必需 sections(详见第 8.3 节)
  - `openspec validate <change-name>` 通过(若 schema 含 validate 步骤)
- **Forbidden**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Review Checkpoint**: 完成本 Wave 后停下,用 question 工具问用户是否继续
- **Agent Profile**: `category="unspecified-low"` (内容生成,非复杂逻辑)

---

### 6.4 Wave 4: tasks

#### 4. [ ] 生成 tasks artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.4 节嵌入的 `tasks.instruction` 行为约束执行
  3. 按第 8.4 节嵌入的 `tasks template` 结构填字段
  4. 写入 OpenSpec artifact 文件
- **Output Path**: `openspec/changes/<change-name>/tasks.md`
- **Embedded Reference**: 第 7.4 节(`tasks.instruction` 全文)+ 第 8.4 节(`tasks template` 全文)
- **Acceptance Criteria**:
  - 文件存在
  - 包含模板必需 sections(详见第 8.4 节)
  - `openspec validate <change-name>` 通过(若 schema 含 validate 步骤)
- **Forbidden**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Review Checkpoint**: 完成本 Wave 后停下,用 question 工具问用户是否继续
- **Agent Profile**: `category="unspecified-low"` (内容生成,非复杂逻辑)

---

## 7. Static Schemas (from `schemas/spec-driven/schema.yaml`)

> **本章节由脚本嵌入。** 内容是 `schema.yaml` 中每个 artifact 的 `instruction` 字段全文,
> 包含 PHASE 1/2/3、Fast Fail Rule、行为约束等。`__LANG_PLACEHOLDER__` 已在生成时按 `OPENSPEC_LANG` 替换。
>
> **阅读指引**:执行第 6 章的 task 时,把对应章节的内容视为"必须遵守的行为指令"——
> 它不是参考附录,而是 schema 层面的强约束,违反会导致 OpenSpec validate 失败。

### 7.1 proposal.instruction

<details>
<summary>展开 instruction 全文(schema.yaml 中 proposal 的 instruction 字段,语言已处理)</summary>

```markdown

**范围限制：不要修改任何源代码。仅生成 proposal.md。**

=== Fast Fail Rule (Global) ===

**任何 task()、tool() 或 skill() 调用失败（超时、agent 不可用、返回错误等），立即停止工作流，不得降级、不得重试、不得跳过、不得自行替代执行。**

=== PHASE 1：上下文提取 ===

**如果对话超过 30 条消息（用户 + AI 的交流）：**
1. 将对话分为三段：前期、中期、后期
2. 从每段中分别提取关键点（每段 3-8 条）
3. 合并所有段落的要点，去重并综合
4. 特别注意中期段落中出现但后续未被重提的点
5. 标记在任何段落中发现的不确定信号

**对于较短的对话：** 直接从完整对话中提取。

将发现组织为 6 个类别：

1. **核心动机**：什么驱动了这次讨论？用户的明确痛点是什么？
2. **变更范围**：讨论到的每个具体能力、修改或移除项，包括提到的技术约束
3. **显式约束**：用户明确的边界——"必须用 X"、"不能用 Y"、兼容性要求
4. **显式非目标**：用户明确说不在范围内的事项
5. **不确定信号**：用户说"需要调研"、"不确定"、"可能需要研究"的点，
   每个标记为 `[NEEDS INVESTIGATION]`
6. **影响系统**：用户提到的代码、API、依赖、团队

**这是思考步骤——不写入文件。**`[NEEDS INVESTIGATION]` 标记仅用于 AI 内部推理，在 proposal.md 中以"待调研"或"TBD"注明即可，无需保留原标记格式。

**输入验证**：如果以下核心类别为空（"核心动机"或"变更范围"或"影响系统"任意一个为空），停止工作流，提示用户：「🔴 proposal 上下文不足。请补充缺失的核心类别（核心动机 / 变更范围 / 影响系统 三项均不可缺），否则无法生成完整 proposal。」
- 这 3 类是 proposal.md 的**最低信息要求**，缺一不可
- 其他 3 类（显式约束、显式非目标、不确定信号）允许为空

=== PHASE 2：生成 ===

在 `openspec/changes/<change-name>/proposal.md` 创建提案文档。

按模板结构编写全部 4 个部分：
- **Why**（动机）：1-2 句话说明问题或机会
- **What Changes**（变更内容）：具体的变更项列表，不兼容变更标记 **BREAKING**
- **Capabilities**（能力清单）：
  - New Capabilities（新能力）：kebab-case 命名，每个对应一个 spec 文件
  - Modified Capabilities（修改的能力）：检查 `openspec/specs/` 中已有的名称
  - Removed Capabilities（移除的能力）：说明移除原因
- **Impact**（影响）：受影响的代码、API、依赖、系统

**完整性优先**——覆盖 PHASE 1 中已确认的要点（排除 `[NEEDS INVESTIGATION]` 项）。

对输出执行以下结构验证：

**模板结构验证**（AI 自检）：proposal.md 必须包含模板的 4 个部分：
- `## Why`（动机）
- `## What Changes`（变更内容）
- `## Capabilities`（能力清单，含 New/Modified/Removed）
- `## Impact`（影响）

缺少任一部分 → 重新生成（最多 3 次），仍不满足则停止并提示用户补充信息。
```

</details>

---

### 7.2 design.instruction

<details>
<summary>展开 instruction 全文(schema.yaml 中 design 的 instruction 字段,语言已处理)</summary>

```markdown

**范围限制：不要修改任何源代码。仅生成 design.md。**

=== Fast Fail Rule (Global) ===

**任何 task()、tool() 或 skill() 调用失败（超时、agent 不可用、返回错误等），立即停止工作流，不得降级、不得重试、不得跳过、不得自行替代执行。**

=== PHASE 1：技术调研 ===

**触发条件**：仅当 `openspec/changes/<change-name>/proposal.md` 中**显式包含 `[NEEDS INVESTIGATION]` 标记**时执行本阶段。
如果 proposal.md 没有 `[NEEDS INVESTIGATION]` 标记 → **跳过整个 PHASE 1**，直接进入 PHASE 2。

对于每个标记为 `[NEEDS INVESTIGATION]` 的点：

 1. **识别调研主题**：从 proposal.md 中提取每个标记点，命名成 kebab-case 的调研主题。例如：`api-signature-format`、`plugin-config-schema`

 2. **单波 librarian 并发调研**：

    所有调研产物保存到 `openspec/changes/<change-name>/research/<topic>/`。

    **所有 librarian 并发**：在同一条消息中发起所有主题的 librarian 任务。每个 librarian 调研其主题的文档或源代码，**直接给出代码示例 + 调用方式**：

    ```
     task(subagent_type="librarian", prompt="调研 plugin.xml 配置声明格式，给出代码示例和调用方式。")
     task(subagent_type="librarian", prompt="调研 OAuth2 PKCE 流程，给出代码示例和调用方式。")
     # ...N 个 topic，全部并发
     ```

     等待所有 librarian 完成后，将每个结果保存到 `research/<topic>/notes.md`


  3. **用户确认**：向用户展示所有调研结果的摘要，**等待用户明确确认后才能继续**。

     **不要自动确认**（避免未审视的调研结论被采纳）。如后续用户消息中表达了与确认/拒绝无关的其他意图，主动提醒调研结果待确认。

    确认后的最终结构（注意：research/ 目录仅在 proposal 包含 `[NEEDS INVESTIGATION]` 标记时创建，notes.md 须含**代码示例 + 调用方式**）：

    ```
    openspec/changes/<change-name>/research/
    ├── index.md                    ← 所有调研点的摘要 + 最终结论
    ├── <topic-1>/                  ← 每个调研点一个子目录
    │   └── notes.md               ← 调研笔记（文档摘录、分析、代码示例、调用方式）
    └── <topic-2>/
        ├── notes.md
        └── ...
    ```

 === PHASE 2：生成 design.md ===

 AI 用 Read/Write 工具直接创建 design.md：

 - 读取 `openspec/changes/<change-name>/proposal.md` — 动机和能力
 - 读取 `openspec/changes/<change-name>/research/` — 技术调研（如果存在）

 设计文档必须包含以下 6 个部分（顺序固定）：

 1. **Context**（上下文）：背景、当前状态、约束、干系人
 2. **Goals / Non-Goals**（目标/非目标）：设计要实现的和明确排除的
 3. **Decisions**（决策）：关键技术选择及理由（为什么选 X 不选 Y？）。包含考虑过的替代方案
 4. **Risks / Trade-offs**（风险/权衡）：已知限制和可能出错的地方。格式：[风险] → 缓解措施
 5. **Migration Plan**（迁移计划）：部署步骤、回滚策略（如适用）
 6. **Open Questions**（未决问题）：尚未解决的决策或未知事项

 关键要求：
 - 关注架构和方法，而非逐行实现
 - 每个设计决策必须对应至少一个 proposal 中的 Capability
 - 如果存在 research findings，在相关 Decisions 中引用，用 `详见 research/<topic>/notes.md` 格式
 - 解释每个技术决策背后的"为什么"
 - 保持聚焦和可执行


  **2.1 验证**：
  1. 6 个必需部分全部存在且顺序正确
  2. `## Decisions` 节中每项决策至少对应 1 个 proposal Capability
  3. 若 research/ 存在，每个 research finding 至少在 1 个 Decision 中被引用
  4. 全部通过 → 继续；任一不通过 → 用 Read/Edit 工具修复 design.md（仅改不通过项），修复后重跑本验证（最多 3 轮，超限后汇总给用户）
```

</details>

---

### 7.3 specs.instruction

<details>
<summary>展开 instruction 全文(schema.yaml 中 specs 的 instruction 字段,语言已处理)</summary>

```markdown

**范围限制：不要修改任何源代码。仅生成 spec 文件。**

=== Fast Fail Rule (Global) ===

**任何 task()、tool() 或 skill() 调用失败（超时、agent 不可用、返回错误等），立即停止工作流，不得降级、不得重试、不得跳过、不得自行替代执行。**

=== PHASE 1：读取输入 ===

读取以下文件，提取 spec 所需的关键信息：
- `openspec/changes/<change-name>/proposal.md` — 动机和 Capabilities
- `openspec/changes/<change-name>/design.md` — 技术决策和设计细节
- `openspec/changes/<change-name>/research/` — 技术调研结论（如果存在）

**Capabilities 必填检查**：如果 proposal 没有列出任何 Capabilities（New 和 Modified 部分都为空），**停止工作流**。


向用户报告：「🔴 proposal 没有列出任何 Capabilities，无法继续。请补充 proposal 的 New 或 Modified Capabilities。如果此次变更不涉及代码（如纯文档/重构），请考虑其他流程。」

**Modified Capability 路径检查**：对 proposal 中列出的每个 Modified Capability，检查 `openspec/specs/<capability>/spec.md` 是否存在。如果不存在，停止工作流，列出所有缺失路径，询问用户是否改为 New Capability 或先创建基础 spec。

=== PHASE 2：生成 spec 文件 ===

复用 PHASE 1 已读取的 proposal.md、design.md 和 research/ 内容。

用 Write 工具为 proposal 的 Capabilities 部分列出的每个能力创建一个 spec 文件（输出路径统一为 `openspec/changes/<change-name>/specs/<capability>/spec.md`）：
- 新能力：使用 proposal 中确切的 kebab-case 名称
- 修改的能力：使用与 proposal 中 Modified capability 同名的 kebab-case 名称（base spec 位于 `openspec/specs/<capability>/spec.md`）

**VALIDATION RULES**（openspec validate 强制检查以下规则）：
1. 每个 requirement 必须以 `### Requirement: <name>` 开头
2. Requirement 描述中必须包含大写 MUST 或 SHALL，不要用中文"必须"
   - 肯定式："The system MUST ..."
   - 否定式："The system MUST NOT ..."
3. 每个 requirement 必须至少有一个 scenario
4. 每个 scenario 必须以 `#### Scenario: <name>` 开头（恰好 4 个 #）
5. 每个 scenario 正文必须包含 WHEN / THEN 关键词

**Delta 操作**（使用 ## 标题）：
- **ADDED Requirements**（新增需求）：新能力
- **MODIFIED Requirements**（修改的需求）：行为变更，必须包含完整更新内容
- **REMOVED Requirements**（移除的需求）：已废弃功能，必须包含**原因**和**迁移方案**
- **RENAMED Requirements**（重命名的需求）：仅名称变更，使用 FROM:/TO: 格式

**MODIFIED requirements 工作流**：
1. 在 `openspec/specs/<capability>/spec.md` 中找到现有 requirement
2. 复制完整的 requirement 块（从 ### Requirement: 到所有 scenarios）
3. 粘贴到 ## MODIFIED Requirements 下，编辑以反映新行为
4. 确保 Requirement 标题文本与源 spec（openspec/specs/<capability>/spec.md）中原始标题完全一致

**常见陷阱**：使用 MODIFIED 但未复制完整的 requirement 块（遗漏 scenarios 或字段），归档时该 requirement 被部分覆盖，丢失原有细节。
如果添加不改变现有行为的新关注点，请使用 ADDED。

**Example 格式参考**：
```
## ADDED Requirements
### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.
#### Scenario: Successful export
- **WHEN** user clicks "Export" button
- **THEN** system downloads a CSV file with all user data
```


=== PHASE 3：验证 ===

编写完所有 spec 文件后，运行：
`openspec validate <change-name>`

**结果分级处理**（E12）：
- 命令不存在 → 停止，提示用户：「🔴 OpenSpec CLI 未安装。请先运行 `npm install -g @fission-ai/openspec`。」
- 返回 ERROR → 修复所有 ERROR 后重新运行，直到通过
- 返回 WARNING → 展示给用户，由用户决定是否修复（不得自行决定忽略）
- 返回 OK → 展示所有 spec 文件路径及摘要给用户，等待用户 review 后再进入下一个 artifact
```

</details>

---

### 7.4 tasks.instruction

<details>
<summary>展开 instruction 全文(schema.yaml 中 tasks 的 instruction 字段,语言已处理)</summary>

```markdown

**范围限制：不要修改任何源代码。本阶段产出：(1) `.omo/plans/<change-name>.md` 完整 9-section OMO plan；(2) `openspec/changes/<change-name>/tasks.md` 空占位文件（plan 内容镜像由 apply 阶段通过 `omo_spec_plan_to_tasks` tool 同步生成）。**

=== Fast Fail Rule (Global) ===

**任何 task()、tool() 或 skill() 调用失败（超时、agent 不可用、返回错误等），立即停止工作流，不得降级、不得重试、不得跳过、不得自行替代执行。**

=== PHASE 1：读取上下文 + Spec 验证 ===

**1.1 读取以下文件：**
- `openspec/changes/<change-name>/proposal.md` — 动机和能力
- `openspec/changes/<change-name>/specs/` — 需求和验收场景
- `openspec/changes/<change-name>/design.md` — 技术方案、决策、风险
- `openspec/changes/<change-name>/research/` — 技术调研（如果存在）

**1.2 Spec 验证**：

运行 `openspec validate <change-name>` 检查 spec 格式。

- 通过 → 继续
- 失败 → 显示错误给用户，由用户决定如何修复。不得自行修复。

=== PHASE 2：生成 OMO 计划 ===

生成 `.omo/plans/<change-name>.md` — OMO 兼容的执行计划。

复用 PHASE 1.1 已读取的 4 个 artifact 内容（proposal.md、specs/、design.md、research/），无需重新读取。

AI **直接**写 OMO 兼容 plan markdown 到 `.omo/plans/<change-name>.md`

**OMO plan 格式规范**（必须严格遵守，Oracle + Momus 会校验）：

```markdown
## 1. TL;DR

一句话概述本次变更做什么。

## 2. Context

背景信息（2-3 句）。

## 3. Work Objectives

- **Must Have**:
  - 目标 1
- **Must NOT Have**:
  - 非目标 1

## 4. Verification Strategy

- **Test Decision**: 单元测试 + E2E
- **Coverage Target**: ≥ 80%

## 5. Execution Strategy

- **Critical Path**: 步骤 A → 步骤 B → 步骤 C
- **Max Concurrent**: 3

## 6. TODOs

### 6.1 Wave 1: 标题

#### 1. [ ] 任务标题

- **What to do**:
  1. 具体动作 1
  2. 具体动作 2
- **Must NOT do**:
  - 不要做 X
- **Recommended Agent Profile**: `category="quick"` 或 `deep` 等
- **References**:
  - `path/to/file.ts` (行号 L100-120)
  - spec: `xxx/spec.md` "requirement 名"
- **Acceptance Criteria**:
  ```bash
  test -f path/to/file.ts && grep -q "pattern" path/to/file.ts
  ```
- **QA Scenarios**:
  - **Happy**: 正常路径
  - **Exception**: 异常路径
  - **Edge**: 边界输入（空、极大、特殊字符）
  - **Performance**: 性能/资源消耗（如适用）
  - **Security**: 权限/注入/敏感数据（如适用）
- **Parallelization**: 可与 Task 2 并发
- **Evidence**: `.omo/evidence/xxx.txt`
- **Commit**: YES

## 7. Final Verification Wave

### F1. [ ] 验证项标题

- **Acceptance Criteria**:
  - 检查 1
  - 检查 2

## 8. Commit Strategy

- 每个 task 一个 commit
- 使用 Conventional Commits 格式

## 9. Success Criteria

- [ ] 硬性指标 1
- [ ] 软性指标 1
```

**关键约束**：
- 9 个 section 标题必须存在（可用 `## 1. TL;DR` 或 `## TL;DR` 两种格式，**推荐编号**以匹配 OMO 项目惯例）
- TODOs section 必须含至少 1 个 `#### {number}. [ ] <title>` 格式任务（{number} 替换为 1/2/3…）
- Final Verification Wave section 必须含至少 1 个 `### F{number}. [ ] <title>` 格式任务（{number} 替换为 1/2/3…）
- Wave 标题（如 `### 6.1 Wave 1: 标题`）用 3 个 `#` + 数字 sub-number + 中英文冒号 `:` 或 `：`

=== PHASE 3：Oracle + Momus 并行审查 Plan + Verdict 处理 ===

**3.1 启动 Oracle + Momus 并行审查**：

```
PLAN_REVIEW_PROMPT = "你正在审查 OMO plan。请逐一检查以下所有检查项：

审查文件：
- plan: .omo/plans/<change-name>.md
- `openspec/changes/<change-name>/proposal.md` — 动机和能力
- `openspec/changes/<change-name>/specs/` — 需求和验收场景
- `openspec/changes/<change-name>/design.md` — 技术方案、决策、风险
- `openspec/changes/<change-name>/research/` — 技术调研（如果存在）

1. OMO 兼容性——plan 是否使用 `## TODOs`（非 `## Tasks`）？任务格式是否为 `N. task`（非 `N.M task`）？
2. Design 对齐——Execution Strategy 是否准确反映了 design 的技术决策和风险缓解措施？
3. Verification 覆盖——Verification Strategy 是否覆盖了 all spec 的 scenarios？
4. Success Criteria——是否可衡量？是否覆盖了所有 capability？
5. research 引用——research/ 的调研发现是否在 plan 中被正确引用？
6. 结构格式——是否使用 summary + link 模式（即每个非 Task section 顶部用 1-2 句概述该 section 关键内容 + 末尾附上对应 artifact 的相对路径引用，如 `详见 proposal.md → Capabilities`）？非 Task sections 是否引用了其他 artifacts？
7. Tasks 质量——每个 task 是否包含 What to do / Must NOT do / Agent Profile / References / Acceptance Criteria / QA Scenarios / Parallelization / Evidence / Commit？内容是否有意义（非占位符）？
8. QA Scenarios 质量——每个 task 的 QA Scenarios 是否列出 5 个标准要素（Happy / Exception / Edge / Performance / Security，Performance/Security 不适用时填 "N/A" 仍视为已列出）？是否至少覆盖 1 个 Happy + 1 个 Exception？
9. 可执行性——FVW 任务是否可直接执行（每项含具体验证命令或观察点）？执行策略是否可行？任务依赖真实？
10. 潜在问题——是否有遗漏的边界场景？逻辑漏洞？矛盾？

严重程度：🔴 阻塞 / 🟡 警告 / ⚪ 建议
输出格式：逐项检查，然后汇总问题清单，每个问题标注 severity。"

ORACLE_PLAN_REVIEW_PROMPT = PLAN_REVIEW_PROMPT

MOMUS_PLAN_REVIEW_PROMPT = "你正在对 OMO plan 执行双重门禁审查（Momus 评审）。

**Part A — 执行路径审查（可操作性）**：
1. Wave 依赖是否合理？同一 Wave 内的 task 是否真的可以并发？
2. 每个 task 的 Acceptance Criteria 是否可执行？（必须是具体的命令，如 `bun test`、`curl`）
3. 有无明显的执行顺序错误？
4. FVW 是否覆盖了关键验证点？
5. 如果 research/ 存在：调研结论是否被 plan 正确引用？（仅检查 plan 内部对 research 结论的引用是否自洽——无需读取 research/ 源文件）

**Part B — 风险矩阵审查（遗漏覆盖）**：
1. 是否有遗漏的边界场景（空值、错误路径、并发冲突、权限不足）？
2. QA Scenarios 是否至少包含一个成功场景（happy path）+ 一个异常场景？
3. Commit Strategy 是否合理？是否有多人协作的冲突风险？
4. Success Criteria 是否真正可衡量？
5. 如果 research/ 存在：是否有 research 发现未被 plan 覆盖？（仅检查 plan 内部对 research 发现的引用是否自洽——无需读取 research/ 源文件）

审查文件：
- plan: .omo/plans/<change-name>.md

最终判定：
- ✅ OKAY → 无 blocking issues，plan 可执行
- 🔴 REJECT → plan 不可执行，需要修复后重新评审

输出格式：先按 Part A / Part B 分别分析，最后给出综合判定。所有发现使用 🔴/🟡/⚪ 标注严重程度。"

task(subagent_type="oracle", prompt=ORACLE_PLAN_REVIEW_PROMPT)
task(subagent_type="momus", prompt=MOMUS_PLAN_REVIEW_PROMPT)
```

**3.2 收集评审结果**：
1. 读取 Oracle 和 Momus 输出，合并发现（同一问题多个 agent 都发现时取更高严重程度）
2. 分类判定：
   - 有 🔴 或 🟡 → BLOCKED，AI 用 Read/Edit 工具直接修复 plan。只修复标记为 🔴/🟡 的问题，不要修改其他内容。修复完成后**只对改动的章节 spot-check 一次**（不重跑 Oracle + Momus agent，避免完整 3 轮重审的开销——修复是 surgical、点对点的，无须全量再审）。**最多 3 轮修复**（每轮修一组 BLOCKED 项，spot-check 通过则进 3.3；超 3 轮仍有 🔴/🟡 则汇总给用户）
   - 仅 ⚪ → 进入 3.3 Verdict 处理

**3.3 Verdict 处理**：

收集所有未解决的 ⚪ 项（来自 PHASE 3 plan 审查遗留），向用户呈现并询问。

=== PHASE 4：创建 tasks.md 占位文件 ===

按 `schemas/spec-driven/templates/tasks.md` 模板的元数据头（仅 front matter / 模板结构，不含 task 列表），生成 `openspec/changes/<change-name>/tasks.md` 空占位文件。task 列表由 apply 阶段通过 `omo_spec_plan_to_tasks` tool 从 plan 镜像生成。
```

</details>

---

## 8. Static Templates (from `schemas/spec-driven/templates/`)

> **本章节由脚本嵌入。** 内容是 `templates/` 目录中每个 artifact 对应的 markdown 模板全文。
>
> **阅读指引**:执行第 6 章的 task 时,把对应章节的内容视为"文件结构骨架"——
> 输出的 artifact 必须包含模板的所有 sections(即使某些 section 内容为空或简略,标题必须存在)。

### 8.1 proposal template (`proposal.md`)

```markdown
## Why

<!-- Explain the motivation for this change. What problem does this solve? Why now? -->

## What Changes

<!-- Describe what will change. Be specific about new capabilities, modifications, or removals. -->

## Capabilities

### New Capabilities
<!-- Capabilities being introduced. Replace <name> with kebab-case identifier (e.g., user-auth, data-export, api-rate-limiting). Each creates specs/<name>/spec.md -->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->
- `<existing-name>`: <what requirement is changing>

## Impact

<!-- Affected code, APIs, dependencies, systems -->
```

---

### 8.2 design template (`design.md`)

```markdown
## Context

<!-- Background and current state -->

## Goals / Non-Goals

**Goals:**

<!-- What this design aims to achieve -->

**Non-Goals:**

<!-- What is explicitly out of scope -->

## Decisions

### Decision: <!-- decision name -->

<!-- Brief context for this decision -->

**Rationale**:

<!-- Why this choice over alternatives -->

**Alternatives Considered**:

<!-- What else was considered and why rejected -->

## Risks / Trade-offs

<!-- Known risks and trade-offs -->

## Migration Plan

<!-- Steps to deploy, rollback strategy (if applicable) -->

## Open Questions

<!-- Outstanding decisions or unknowns to resolve -->
```

---

### 8.3 specs template (`spec.md`)

```markdown
## ADDED Requirements

### Requirement: <!-- requirement name -->

<!-- requirement text MUST contain uppercase MUST or SHALL -->

#### Scenario: <!-- scenario name -->

- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->

## MODIFIED Requirements

<!-- For delta specs. Copy FULL requirement block (including all scenarios) from original spec. -->
<!-- ### Requirement: <exact original name> -->
<!-- Description with MUST/SHALL -->
<!-- #### Scenario: <scenario name> -->
<!-- - **WHEN** <condition> -->
<!-- - **THEN** <expected outcome> -->

## REMOVED Requirements

<!-- ### Requirement: <name> -->
<!-- **Reason**: why deprecated -->
<!-- **Migration**: alternative approach -->
```

---

### 8.4 tasks template (`tasks.md`)

```markdown
## Tasks

> 本文件由 `.omo/plans/<change-name>.md` 在 apply 阶段经 `sync-plan-to-tasks.ts` 脚本镜像生成。
> 修改 plan 后重新运行 sync tool 即可更新。
> **不要手动编辑**——下次同步会被覆盖。

---
```

---

## 9. Compile Plan Generation

<!-- LLM_FILL: 描述如何把第 6.1-6.3 Wave 产出的 3 个 artifacts(proposal/design/specs)翻译成 compile plan 的 9 章节。compile plan 输出到 `.omo/plans/add-user-auth.md`,供 apply 阶段 `/start-work add-user-auth` 实施。 -->

### 9.1 翻译映射

| Compile plan 章节          | 来源 artifact + 字段                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| 1. TL;DR                   | `proposal.md` 的 ## Why(一句话浓缩)                                                              |
| 2. Context                 | `design.md` 的 ## Context + `proposal.md` 的 ## Impact                                           |
| 3. Work Objectives         | `proposal.md` 的 ## What Changes + ## Capabilities                                               |
| 4. Verification Strategy   | `specs/*.md` 的所有 #### Scenario(WHEN/THEN)                                                     |
| 5. Execution Strategy      | `design.md` 的 ## Decisions + ## Risks/Trade-offs                                                |
| 6. TODOs                   | 拆 `specs/*.md` 的每个 ### Requirement 为 1 个 task;Wave 划分按 `design.md` 的 ## Migration Plan |
| 7. Final Verification Wave | 复述 `specs/*.md` 的所有 #### Scenario 的 THEN 断言                                              |
| 8. Commit Strategy         | 1 task 1 commit,commit message 引用 `proposal.md` 的 ## What Changes                             |
| 9. Success Criteria        | `proposal.md` 的 ## Impact + `design.md` 的 ## Goals                                             |

### 9.2 写入位置

```
.omo/plans/add-user-auth.md
```

### 9.3 验证清单

- [ ] 9 个章节标题全部存在(编号 + 名称格式)
- [ ] `## TODOs` 至少 1 个 `#### N. [ ]` task
- [ ] `## Final Verification Wave` 至少 1 个 `### FN. [ ]` 项
- [ ] 每个 task 含 What to do / Must NOT do / Agent Profile / References / Acceptance Criteria
- [ ] `Acceptance Criteria` 至少 1 个可执行命令(`bun test`、`grep`、`curl` 等)

### 9.4 不需要的事

- 不调 `openspec instructions`(compile plan 不再 fetch CLI)
- 不调 `omo_spec_plan_to_tasks` / `sync-plan-to-tasks.ts`(这是 apply 阶段的事,本阶段不做)
- 不修改任何 OpenSpec artifact 文件(它们已经是 source of truth)

---

<!--
  ═══════════════════════════════════════════════════════════════════
  执行模式
  ═══════════════════════════════════════════════════════════════════

  用户 review 完本 source plan 后,跑:
    /start-work source-add-user-auth

  OMO 会按 ## TODOs 的 Wave 顺序逐个执行。每个 Wave 完成后:
    1. AI 报告 "Wave N completed: <产出文件路径>"
    2. AI 用 question 工具问 "是否继续 Wave N+1?"
    3. 用户 Yes → 继续 / No → 停下,等用户指示

  全部 Wave 完成后:
    1. AI 报告 "Source plan execution done. Artifacts + compile plan ready."
    2. 提示用户跑 /omo-apply-change add-user-auth 进入实施阶段
-->
