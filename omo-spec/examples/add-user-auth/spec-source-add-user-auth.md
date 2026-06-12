## TL;DR

生成基于SDD流程的add-user-auth迭代所需的所有文档,严格按线性sdd流程 proposal → design → spec 顺序生成,并产出目标计划文件 spec-target-add-user-auth.md(用于后续 /start-work 执行)

## Context

<TODO: 2-5 句话说明背景 —— 当前系统状态、为什么需要这次变更、相关的技术债务或业务需求。>

## Work Objectives

**Must Have**:

- 生成 `spec/add-user-auth/proposal.md` — 含 Why / What Changes / Capabilities / Impact 四节
- 生成 `spec/add-user-auth/design.md` — 含 Context / Goals / Decisions / Risks 四节
- 生成 `spec/add-user-auth/spec.md` — Requirement 描述必须含大写 MUST/SHALL,Scenario 用 #### 4 个 `#` + WHEN/THEN 关键词
- 产出目标计划 `spec-target-add-user-auth.md` — 9 个 OMO 章节齐全,供后续 /start-work 执行
- 严格按线性 sdd 流程顺序:proposal → design → spec → target-plan(不可并行/不可重排)

**Must NOT Have**:

- 任何**Must Have**列表之外的产物(只能产出 Must Have 列出的文档,不能多也不能少)
- 任何对老文件的修改
- 任何代码改动

## Verification Strategy

每个阶段开始前,调 Oracle subagent 评审上一阶段产物(self-review,read-only 顾问):

```typescript
task(
  (subagent_type = "oracle"),
  (prompt =
    "评审 spec/<change-name>/{artifact}.md,验证 Must NOT Have(无额外产物 / 不改老文件 / 不改代码 / 静态嵌入) + 结构完整"),
  (load_skills = []),
);
```

### proposal.md评审prompt

### design.md评审prompt

### spec.md评审prompt

## Execution Strategy

**Critical Path**: proposal → design → spec
**Max Concurrent**: 1(artifacts 之间存在硬依赖)

任何 task 失败 → 立即停止(Fast Fail)。

## Tasks

### Wave 1: 生成spec/add-user-auth/proposal.md

- [ ] 1.1 生成 proposal

  **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按 `omo-spec/artifacts/proposal/proposal.instruction` 行为约束执行
  3. 按 `omo-spec/artifacts/proposal/proposal.template` 结构填字段
  4. 写入 `spec/add-user-auth/proposal.md`

  **Must NOT do**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量
  - 修改任何源代码

  **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

  **References**:
  - omo-spec/artifacts/proposal/proposal.instruction
  - omo-spec/artifacts/proposal/proposal.template

  **Acceptance Criteria**:

  ```bash
  test -f spec/add-user-auth/proposal.md
  ```

  **QA Scenarios**:
  Scenario: 结构完整 / Steps: grep "## Why\|## What Changes\|## Capabilities\|## Impact" / Expected: 4 个 section 齐全

- [ ] 1.2 生成 design

  **What to do**:
  1. 读取 `spec/add-user-auth/proposal.md`(Wave 1 产物)作为输入
  2. 按 `omo-spec/artifacts/design/design.instruction` 行为约束执行
  3. 按 `omo-spec/artifacts/design/design.template` 结构填字段
  4. 写入 `spec/add-user-auth/design.md`

  **Must NOT do**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量
  - 修改任何源代码

  **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

  **References**:
  - spec/add-user-auth/proposal.md
  - omo-spec/artifacts/design/design.instruction
  - omo-spec/artifacts/design/design.template

  **Acceptance Criteria**:

  ```bash
  test -f spec/add-user-auth/design.md
  ```

  **QA Scenarios**:
  Scenario: 结构完整 / Steps: grep "## Context\|## Goals\|## Decisions\|## Risks" / Expected: 4 个 section 齐全

### Wave 2: spec + target-plan

- [ ] 2.1 生成 spec

  **What to do**:
  1. 读取 `spec/add-user-auth/proposal.md` + `spec/add-user-auth/design.md`(Wave 1 产物)作为输入
  2. 按 `omo-spec/artifacts/spec/spec.instruction` 行为约束执行
  3. 按 `omo-spec/artifacts/spec/spec.template` 结构填字段
  4. 写入 `spec/add-user-auth/spec.md`

  **Must NOT do**:
  - 写入 `<context>` / `<rules>` / `<project_context>` 字面量
  - 修改任何源代码

  **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

  **References**:
  - spec/add-user-auth/proposal.md
  - spec/add-user-auth/design.md
  - omo-spec/artifacts/spec/spec.instruction
  - omo-spec/artifacts/spec/spec.template

  **Acceptance Criteria**:

  ```bash
  test -f spec/add-user-auth/spec.md
  openspec validate add-user-auth
  ```

  **QA Scenarios**:
  Scenario: validate 通过 / Steps: openspec validate add-user-auth / Expected: 返回 OK

- [ ] 2.2 生成 target-plan

  **What to do**:
  1. 读取 `spec/add-user-auth/proposal.md` + `spec/add-user-auth/design.md` + `spec/add-user-auth/spec.md`(Wave 1+2.1 产物)作为输入
  2. 按本 source plan(`spec-source-add-user-auth.md`)中 `## 1. TL;DR` `## 2. Context` `## 3. Work Objectives` `## 4. Verification Strategy` `## 5. Execution Strategy` `## 7. Final Verification Wave` `## 8. Commit Strategy` `## 9. Success Criteria` 9 个章节的 TODO 占位符,翻译成 target-plan
  3. 写入 `.omo/plans/add-user-auth.md`

  **Must NOT do**:
  - 修改 source plan(`spec-source-add-user-auth.md`)
  - 修改任何源代码

  **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

  **References**:
  - spec-source-add-user-auth.md(本文件)
  - spec/add-user-auth/proposal.md
  - spec/add-user-auth/design.md
  - spec/add-user-auth/spec.md

  **Acceptance Criteria**:

  ```bash
  test -f .omo/plans/add-user-auth.md
  grep -c "## Tasks" .omo/plans/add-user-auth.md  # 必须有 ## Tasks 章节
  ```

  **QA Scenarios**:
  Scenario: target-plan 结构正确 / Steps: 9 个 OMO 章节齐全 / Expected: TL;DR/Context/Work Objectives/Verification/Execution/Tasks/Final Verification Wave/Commit Strategy/Success Criteria

## Final Verification Wave

- [ ] F1. **proposal 验证** — <TODO: 验证 proposal 的内容质量>
- [ ] F2. **design 验证** — <TODO: 验证 design 的内容质量>
- [ ] F3. **spec 验证** — <TODO: 验证 spec 的内容质量>
- [ ] F4. **omo-spec 工作流验证** — <TODO: 验证老 skill 0 diff,产物与 1.0 一致>

## Commit Strategy

<TODO: commit 策略。每个 artifact 一个 commit,Conventional Commits 格式。>

- <TODO: Wave 1 (proposal) 的 commit message,如 `feat(spec): add user-auth proposal`>
- <TODO: Wave 2 (design) 的 commit message,如 `feat(spec): add user-auth design`>
- <TODO: Wave 3 (spec) 的 commit message,如 `feat(spec): add user-auth spec`>

## Success Criteria

<TODO: 成功标准 —— 所有条件满足才算完成。用 checkbox 列表。应与 FVW 验证项对应。>

- [ ] `spec/add-user-auth/proposal.md` 生成且通过结构验证(F1)
- [ ] `spec/add-user-auth/design.md` 生成且通过结构验证(F2)
- [ ] `spec/add-user-auth/spec.md` 生成且通过结构验证(F3)
- [ ] 所有 artifact 模板 HTML 注释不残留
- [ ] omo-spec 工作流自身未污染老仓库

<!-- Progress Tracking (Meta: sync protocol for task states) -->

- tasks.md is the single source of truth for checkbox states
- When updating a checkbox in tasks.md, immediately mirror the change in this plan's ## Tasks section
- On pause or all_done: sync checkbox states from tasks.md to this plan and update .sisyphus/boulder.json
- Do NOT use todowrite/todoread
