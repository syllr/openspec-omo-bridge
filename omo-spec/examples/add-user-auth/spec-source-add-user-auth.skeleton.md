# omo-spec Source Plan Template

> 本文件是 `gen-source-plan.ts` 脚本读取的骨架模板,用于生成 `spec-source-<change-name>.md`。
> 脚本只替换 `{{...}}` 占位符,不动 `<!-- LLM_FILL: ... -->` 标记。
>
> **LLM 填充规则**:
>
> - 看到 `<!-- LLM_FILL: 描述 -->` 标记 → 用对应的 markdown 内容替换整行注释
> - 看到 `_(待 LLM 填充)_` 标记 → 同上
> - **绝不**删除或修改任何 `{{...}}` 占位符(脚本会报错)
> - **绝不**修改第 6 章的 TODOs 内容(脚本生成,包含 instruction)

---

<!--
  ═══════════════════════════════════════════════════════════════════
  章节结构说明(OMO 9 章节格式)
  ═══════════════════════════════════════════════════════════════════
  - 第 1-5 章: LLM 填充业务内容(基于对话上下文)
  - 第 6 章:   脚本按用户选的 artifacts 顺序生成 Wave 块(LLM 不动)
  - 第 7 章:   Final Verification Wave(LLM 填充)
  - 第 8 章:   Commit Strategy(LLM 填充)
  - 第 9 章:   Success Criteria(LLM 填充)
-->

---

mode: source
generator: omo-spec
changeName: add-user-auth
generatedAt: "2026-06-11"
targetArtifacts:
  - proposal
  - design
  - spec
specDir: spec/add-user-auth
planFile: spec-source-add-user-auth.md
reviewCheckpointPolicy: per-wave-pause

---

# omo-spec Source Plan: add-user-auth

> **本文件由 `omo-spec` skill 生成,跑 `/start-work spec-source-add-user-auth` 执行。**
> 生成器版本:omo-spec 1.0
> 阅读时长:预计 3-5 分钟 | 执行时长:预计 10-30 分钟(每个 Wave 1 个 artifact)

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

<!-- LLM_FILL: 描述如何验证 artifacts 生成正确 -->

- **Artifact 结构验证**:
  - 每个 artifact 包含模板必需的 sections
  - `openspec validate add-user-auth` 通过(specs 阶段后)
- **Review Checkpoint**:
  - 每个 Wave 完成后停下让用户 review(per-wave-pause policy)

---

## 5. Execution Strategy

<!-- LLM_FILL: 关键路径 / 并发上限 / 顺序约束 -->

- **Critical Path**: 按 artifacts 依赖顺序(严格顺序)
- **Max Concurrent**: 1(artifacts 之间存在硬依赖)
- **Hard Failure Rule**:
  - 任何 `task()` / `tool()` / `skill()` 调用失败 → 立即停止,不得降级/重试/跳过/自行替代执行

---

## 6. TODOs

> **本章节由脚本按用户选的 artifacts 顺序自动生成,LLM 不修改。**
> 每个 Wave 对应一个 artifact,Wave 内仅含 1 个 task。
> task 包含完整的 instruction 内容,LLM 在执行 task 时必须按 instruction 行事。

### 6.1 Wave 1: proposal

#### 1. [ ] 生成 proposal artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.1 节嵌入的 `proposal.instruction` 行为约束执行
  3. 按第 8.1 节嵌入的 `proposal template` 结构填字段
  4. 写入 OpenSpec artifact 文件
- **Output Path**: `openspec/changes/<change-name>/proposal.md`(或 `specs/<capability>/spec.md`)
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
- **Output Path**: `openspec/changes/<change-name>/design.md`(或 `specs/<capability>/spec.md`)
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

### 6.3 Wave 3: spec

#### 3. [ ] 生成 spec artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.3 节嵌入的 `spec.instruction` 行为约束执行
  3. 按第 8.3 节嵌入的 `spec template` 结构填字段
  4. 写入 OpenSpec artifact 文件
- **Output Path**: `openspec/changes/<change-name>/spec.md`(或 `specs/<capability>/spec.md`)
- **Embedded Reference**: 第 7.3 节(`spec.instruction` 全文)+ 第 8.3 节(`spec template` 全文)
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

## 7. Final Verification Wave

<!-- LLM_FILL: 列出最终验证项(每个 artifact 一个验证点) -->

### F1. [ ] 验证 proposal.md

- **Acceptance Criteria**:
  - 文件存在
  - 包含 ## Why / ## What Changes / ## Capabilities / ## Impact

### F2. [ ] 验证 design.md

- **Acceptance Criteria**:
  - 文件存在
  - 包含 ## Context / ## Goals / ## Decisions / ## Risks

### F3. [ ] 验证 spec.md

- **Acceptance Criteria**:
  - 文件存在
  - 包含 ## ADDED Requirements 或 ## MODIFIED Requirements
  - 每个 Requirement 有 #### Scenario

---

## 8. Commit Strategy

<!-- LLM_FILL: 描述 commit 策略 -->

- 每个 artifact 一个 commit
- commit message 格式: `feat(<change-name>): add <artifact> artifact`
- 使用 Conventional Commits 格式

---

## 9. Success Criteria

<!-- LLM_FILL: 列出本次变更的成功标准 -->

- [ ] `spec/<change-name>/proposal.md` 生成且内容完整
- [ ] `spec/<change-name>/design.md` 生成且内容完整
- [ ] `spec/<change-name>/spec.md` 生成且内容完整
- [ ] `openspec validate add-user-auth` 通过
- [ ] 所有 artifact 的 instruction 约束被遵守

---

<!--
  ═══════════════════════════════════════════════════════════════════
  执行模式
  ═══════════════════════════════════════════════════════════════════

  用户 review 完本 source plan 后,跑:
    /start-work spec-source-add-user-auth

  OMO 会按 ## TODOs 的 Wave 顺序逐个执行。每个 Wave 完成后:
    1. AI 报告 "Wave N completed: <产出文件路径>"
    2. AI 用 question 工具问 "是否继续 Wave N+1?"
    3. 用户 Yes → 继续 / No → 停下,等用户指示

  全部 Wave 完成后:
    1. AI 报告 "Source plan execution done. All artifacts generated."
    2. 提示用户跑 /openspec-archive-change add-user-auth 归档
-->
