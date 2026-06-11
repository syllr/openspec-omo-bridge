# Source Plan: add-user-auth

## 1. TL;DR

<!-- LLM_FILL: 用 1 句话概述本次变更做什么 -->

_(待 LLM 填充)_

---

## 2. Context

<!-- LLM_FILL: 2-3 句话说明背景 -->

_(待 LLM 填充)_

---

## 3. Work Objectives

<!-- LLM_FILL: Must Have / Must NOT Have -->

- **Must Have**:
  - _(待 LLM 填充)_
- **Must NOT Have**:
  - _(待 LLM 填充)_

---

## 4. Verification Strategy

<!-- LLM_FILL: 如何验证 artifacts 生成正确 -->

- **Artifact 结构验证**:
  - 每个 artifact 包含模板必需的 sections
  - `openspec validate add-user-auth` 通过
- **Review Checkpoint**:
  - 每个 Wave 完成后停下让用户 review

---

## 5. Execution Strategy

<!-- LLM_FILL: 关键路径 / 并发上限 / 顺序约束 -->

- **Critical Path**: 按 artifacts 依赖顺序
- **Max Concurrent**: 1
- **Hard Failure Rule**: 任何调用失败 → 立即停止

---

## 6. TODOs

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

<!-- LLM_FILL: 最终验证项 -->

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

<!-- LLM_FILL: commit 策略 -->

- 每个 artifact 一个 commit
- 使用 Conventional Commits 格式

---

## 9. Success Criteria

<!-- LLM_FILL: 成功标准 -->

- [ ] `spec/add-user-auth/proposal.md` 生成且内容完整
- [ ] `spec/add-user-auth/design.md` 生成且内容完整
- [ ] `spec/add-user-auth/spec.md` 生成且内容完整
- [ ] `openspec validate add-user-auth` 通过
