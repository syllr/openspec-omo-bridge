# Source Plan: add-user-auth

## 1. TL;DR
<!-- LLM_FILL: 用 1 句话概述本次变更做什么 -->

_(待 LLM 填充)_


## 2. Context
<!-- LLM_FILL: 2-3 句话说明背景 -->

_(待 LLM 填充)_


## 3. Work Objectives
<!-- LLM_FILL: Must Have / Must NOT Have -->

_(待 LLM 填充)_


## 4. Verification Strategy
<!-- LLM_FILL: 如何验证 artifacts 生成正确 -->

_(待 LLM 填充)_


## 5. Execution Strategy
<!-- LLM_FILL: 关键路径 / 并发上限 / 顺序约束 -->

_(待 LLM 填充)_


## 6. TODOs

### 6.1 Wave 1: proposal

#### 1. [ ] 生成 proposal

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按 instruction 行为约束执行
  3. 按 template 结构填字段
  4. 写入 `spec/<change-name>/proposal.md`
- **Must NOT do**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Recommended Agent Profile**: `category="unspecified-low"`
- **References**:
  - instruction: `omo-spec/artifacts/proposal/instruction.md`
  - template: `omo-spec/artifacts/proposal/template.md`
  - output: `spec/<change-name>/proposal.md`
- **Acceptance Criteria**:
  - `test -f spec/<change-name>/proposal.md`
  - 文件包含模板必需 sections
- **QA Scenarios**:
  - **Happy**: 正常生成,无错误
  - **Exception**: 模板缺失时报错
  - **Edge**: 空模板处理
  - **Performance**: N/A
  - **Security**: N/A
- **Parallelization**: 无(严格顺序)
- **Evidence**: `spec/<change-name>/proposal.md`
- **Commit**: YES

---

### 6.2 Wave 2: design

#### 2. [ ] 生成 design

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按 instruction 行为约束执行
  3. 按 template 结构填字段
  4. 写入 `spec/<change-name>/design.md`
- **Must NOT do**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Recommended Agent Profile**: `category="unspecified-low"`
- **References**:
  - instruction: `omo-spec/artifacts/design/instruction.md`
  - template: `omo-spec/artifacts/design/template.md`
  - output: `spec/<change-name>/design.md`
- **Acceptance Criteria**:
  - `test -f spec/<change-name>/design.md`
  - 文件包含模板必需 sections
- **QA Scenarios**:
  - **Happy**: 正常生成,无错误
  - **Exception**: 模板缺失时报错
  - **Edge**: 空模板处理
  - **Performance**: N/A
  - **Security**: N/A
- **Parallelization**: 无(严格顺序)
- **Evidence**: `spec/<change-name>/design.md`
- **Commit**: YES

---

### 6.3 Wave 3: spec

#### 3. [ ] 生成 spec

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按 instruction 行为约束执行
  3. 按 template 结构填字段
  4. 写入 `spec/<change-name>/spec.md`
- **Must NOT do**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Recommended Agent Profile**: `category="unspecified-low"`
- **References**:
  - instruction: `omo-spec/artifacts/spec/instruction.md`
  - template: `omo-spec/artifacts/spec/template.md`
  - output: `spec/<change-name>/spec.md`
- **Acceptance Criteria**:
  - `test -f spec/<change-name>/spec.md`
  - 文件包含模板必需 sections
- **QA Scenarios**:
  - **Happy**: 正常生成,无错误
  - **Exception**: 模板缺失时报错
  - **Edge**: 空模板处理
  - **Performance**: N/A
  - **Security**: N/A
- **Parallelization**: 无(严格顺序)
- **Evidence**: `spec/<change-name>/spec.md`
- **Commit**: YES

## 7. Final Verification Wave
<!-- LLM_FILL: 最终验证项 -->

_(待 LLM 填充)_


## 8. Commit Strategy
<!-- LLM_FILL: commit 策略 -->

_(待 LLM 填充)_


## 9. Success Criteria
<!-- LLM_FILL: 成功标准 -->

_(待 LLM 填充)_

