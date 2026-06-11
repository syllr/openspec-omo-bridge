# Source Plan: {{CHANGE_NAME}}

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
  - `openspec validate {{CHANGE_NAME}}` 通过
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

{{WAVES_BLOCK}}

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

- [ ] `spec/{{CHANGE_NAME}}/proposal.md` 生成且内容完整
- [ ] `spec/{{CHANGE_NAME}}/design.md` 生成且内容完整
- [ ] `spec/{{CHANGE_NAME}}/spec.md` 生成且内容完整
- [ ] `openspec validate {{CHANGE_NAME}}` 通过
