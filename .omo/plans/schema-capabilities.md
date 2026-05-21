## TL;DR

新增一个独立的 `constitution` schema，提供项目宪法的标准化创建与更新流程（scan → design → tasks → critic → apply）。宪法管理技术栈、编码规范、架构约束、测试标准等项目级元数据，与现有的 spec-driven 变更流程平级且不冲突。

> See [proposal.md](openspec/changes/schema-capabilities/proposal.md)

## Context

当前 spec-driven schema 专注于每次变更的流程管理（proposal → specs → design → tasks → critic → apply），但缺少项目层面的元数据管理——技术栈、编码规范、架构约束等宪法信息只能手动编写 AGENTS.md。参考 GSD、Spec Kit、Harmony 等工具，新增 constitution schema 填补这一空白。

> See [proposal.md](openspec/changes/schema-capabilities/proposal.md)

## Work Objectives

- **constitution-schema**: 创建独立的 constitution schema
  - 五步 artifact 链：scan → design → tasks → critic → apply
  - critic 和 apply 复制 spec-driven 并适配（去掉 validate specs，质量门禁改为检查 constitution 产出）
  - scan 阶段：4 Phase 分层 + 多 agent 并行调研
  - design 阶段：多 agent 调研 + summarize-research + 可选代码同步
  - tasks 阶段：2 项基础任务 + 1 项可选任务
  - 可重入设计：固定命名 + 三级检测（init/update/incomplete）
  - 输出：AGENTS.md + `.opencode/skills/constitution/` skill 文件 + references

> See [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

## Verification Strategy

每个 spec requirement 有对应的 scenario 作为验收标准：
- R1 独立 schema：验证不修改 spec-driven，独立注册
- R2 五步链：验证每个 artifact 的依赖顺序和产出
- R3 SKILL.md 格式：验证 frontmatter 格式和自动发现
- R4 多级索引：验证 AGENTS.md 章节和 references 结构
- R5/R6 目录结构：验证单 module 平铺和多 module 分目录
- R7 可重入：验证 init/update/incomplete 三级检测
- R8 用户主导更新：验证 diff 保留自定义内容

> See [specs](openspec/changes/schema-capabilities/specs/)

## Execution Strategy

核心设计决策来自 design.md：
- D1: 独立 schema，复用 critic + apply
- D2: 五步链，scan/design 深，tasks 简
- D3: OpenCode SKILL.md 格式
- D4: 多级知识索引 + 按 module 分目录
- D5: 可重入设计 + 固定命名
- D6: Plan 文件格式适配

> See [design.md](openspec/changes/schema-capabilities/design.md)

## Tasks

### Wave 1: Schema 定义

 - [x] 1.1 创建 `schemas/constitution/schema.yaml`
      **What to do**:
      定义五个 artifact（scan → design → tasks → critic → apply）及其 instruction、template、requires、generates 字段。
      - scan.instruction：4 Phase（检测→对话→调研→汇总），处理已有/空项目两条路径
      - design.instruction：多 agent 调研 + summarize-research + question tool 询问代码同步
      - tasks.instruction：2 项基础 + 1 项可选
      - critic.instruction：复制 spec-driven 并适配——去掉 validate specs，质量门禁改为检查 constitution 产出（frontmatter 格式 blocking、AGENTS.md 章节存在 blocking、core references 存在 warning、引用完整性 warning）
      - core reference files 定义：单 module = {tech-stack.md, architecture.md}；多 module = 每 module 的 tech-stack.md + 顶层 architecture.md
      - apply.instruction：复制 spec-driven 并适配——写入 AGENTS.md + skill 文件，三级 init/update/incomplete 检测
      - requires：scan 空，design→[scan]，tasks→[design]，critic→[tasks]，apply→[critic]

      **Must NOT do**:
      - 不要修改 schemas/spec-driven/ 下的任何文件
      - instruction 不要硬编码路径

      **Recommended Agent Profile**: category="unspecified-high", load_skills=[]

      **References**:
      - schemas/spec-driven/schema.yaml
      - design.md:46-137 (Decision 2)
      - design.md:64-93 (scan 4 Phase)
      - design.md:161-182 (Decision 3 - SKILL.md frontmatter format)
      - design.md:229-260 (Decision 5)
      - design.md:262-288 (Decision 6)

      **Acceptance Criteria**:
      - openspec validate schema-capabilities 通过
      - 5 个 artifact 的 requires 链正确
      - 每个 artifact 有 id/generates/template/instruction/requires

      **QA Scenarios**:
      Scenario: 依赖链验证 / Steps: 检查 requires 字段 / Expected: scan→设计→tasks→critic→apply 无环
      Scenario: instruction 完整性 / Steps: 检查每个 instruction / Expected: 5 个非空

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

 - [x] 1.2 创建 `schemas/constitution/templates/scan.md`
      **What to do**:
      创建 scan 模板，骨架风格（HTML comment 占位符），引导输出结构化技术栈分析报告。

      **Must NOT do**:
      - 不要预填技术栈内容

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - schemas/spec-driven/templates/ 参考骨架

      **Acceptance Criteria**:
      - 文件存在于 schemas/constitution/templates/scan.md

      **QA Scenarios**:
      Scenario: 模板结构验证 / Steps: 检查模板是否包含 Phase 占位符 / Expected: 扫描/调研/汇总等阶段占位符齐全

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

 - [x] 1.3 创建 `schemas/constitution/templates/constitution-design.md`
      **What to do**:
      创建 design 模板，引导输出宪法结构设计文档。

      **Must NOT do**:
      - 不要预填技术栈内容

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - schemas/spec-driven/templates/ 参考骨架

      **Acceptance Criteria**:
      - 文件存在于 schemas/constitution/templates/constitution-design.md

      **QA Scenarios**:
      Scenario: 模板结构验证 / Steps: 检查模板是否包含技术栈列表和章节结构占位符 / Expected: 结构占位符齐全

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

 - [x] 1.4 创建 `schemas/constitution/templates/tasks.md`
      **What to do**:
      创建 constitution 专用版 tasks 模板。继承 Wave 分组 + checkbox 结构，适配 2 项基础 + 1 项可选场景。

      **Must NOT do**:
      - 不要预填具体任务内容（模板是骨架）

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - schemas/spec-driven/templates/tasks.md

      **Acceptance Criteria**:
      - 文件存在于 schemas/constitution/templates/tasks.md

      **QA Scenarios**:
      Scenario: 模板结构验证 / Steps: 检查模板的 Wave 分组和 checkbox 格式 / Expected: 与 spec-driven 的 tasks.md 结构一致

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

 - [x] 1.5 创建 `schemas/constitution/templates/critic.md`
      **What to do**:
      创建 constitution 专用版 critic 模板。保留 5 路 Momus 审查报告结构，去掉 specs validation 引用。

      **Must NOT do**:
      - 不要引用 proposal 或 specs（constitution 没有这些）

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - schemas/spec-driven/templates/critic.md
      - design.md:262-288 (Decision 6)

      **Acceptance Criteria**:
      - 文件存在于 schemas/constitution/templates/critic.md

      **QA Scenarios**:
      Scenario: 模板结构验证 / Steps: 检查模板的 5 路 Momus 审查报告占位符 / Expected: 结构占位符齐全

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

### Wave 2: 集成

 - [x] 2.1 更新 `scripts/sync-schemas.sh`
      **What to do**:
      验证 sync-schemas.sh 自动发现 constitution schema（通配符遍历）。如需要添加 --schema constitution 参数。

      **Must NOT do**:
      - 不要破坏 spec-driven 的同步逻辑

      **Recommended Agent Profile**: category="quick", load_skills=[]

      **References**:
      - scripts/sync-schemas.sh

      **Acceptance Criteria**:
      - bash -n scripts/sync-schemas.sh 通过

      **QA Scenarios**:
      Scenario: 验证干跑 / Steps: 运行 bash -n scripts/sync-schemas.sh / Expected: 无语法错误

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

 - [x] 2.2 更新 AGENTS.md 添加 constitution schema 说明
      **What to do**:
      在 AGENTS.md 中添加 `## Constitution Schema` 章节，包含：schema 用途（项目宪法初始化）、五步 artifact 链、调用方式（`openspec new change --schema constitution <name>`）、可重入更新支持说明。

      **Must NOT do**:
      - 不要删除或修改 AGENTS.md 现有的其他章节

      **Recommended Agent Profile**: category="writing", load_skills=[]

      **References**:
      - AGENTS.md
      - design.md 设计决策概要

      **Acceptance Criteria**:
      - AGENTS.md 包含 `## Constitution Schema` 章节
      - 章节内容包含 schema 用途、调用方式和更新说明

      **QA Scenarios**:
      Scenario: 章节存在性 / Steps: grep '## Constitution Schema' AGENTS.md / Expected: 匹配成功

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

### Wave 3: 验证

 - [x] 3.1 schema 结构验证
      **What to do**:
      检查 schema.yaml 字段完整性、模板文件存在性、依赖链正确性。

      **Must NOT do**:
      - 不要运行 openspec new change 或任何创建性命令

      **Recommended Agent Profile**: category="quick", load_skills=[]

      **References**:
      - schemas/constitution/schema.yaml
      - schemas/constitution/templates/

      **Acceptance Criteria**:
      - ls schemas/constitution/templates/ 列出 5 个模板文件
      - openspec validate schema-capabilities 通过

      **QA Scenarios**:
      Scenario: 模板完整 / Steps: ls schemas/constitution/templates/ / Expected: 列出 scan.md, constitution-design.md, tasks.md, critic.md
      Scenario: 依赖链正确 / Steps: 检查 schema.yaml 的 requires 字段 / Expected: scan(空)→design(tasks)→tasks(design)→critic(tasks)→apply(critic)

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

 - [x] 3.2 手动测试（本 change 完成后执行）
      **What to do**:
      手动验证 init 和 update 两条路径。
      1. sync-schemas.sh 注册 schema
      2. openspec new change --schema constitution test-init 验证 init
      3. openspec new change --schema constitution test-update 验证 update

      **Must NOT do**:
      - 不要在 production 项目中运行测试

      **Recommended Agent Profile**: category="quick", load_skills=[]

      **Acceptance Criteria**:
      - init: AGENTS.md 有 ## Constitution，.opencode/skills/constitution/ 完整
      - update: 检测已有文件，进入 diff 确认

      **QA Scenarios**:
      Scenario: init 路径 / Steps: openspec status --change test-init / Expected: 5 个 artifact 全部创建
      Scenario: update 路径 / Steps: 检查 apply 阶段是否进入 diff 模式 / Expected: 提示"检测到已有宪法，是否更新"

      > See OpenSpec context: [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — oracle
- [ ] F2. **Code Quality Review** — unspecified-high
- [ ] F3. **Real Manual QA** — unspecified-high
- [ ] F4. **Scope Fidelity Check** — deep

## Commit Strategy

- Task 1.1 → schemas/constitution/schema.yaml → `feat(schema): add constitution schema with 5-artifact chain`
- Task 1.2 → schemas/constitution/templates/scan.md → `feat(template): add scan template`
- Task 1.3 → schemas/constitution/templates/constitution-design.md → `feat(template): add design template`
- Task 1.4 → schemas/constitution/templates/tasks.md → `feat(template): add constitution-specific tasks template`
- Task 1.5 → schemas/constitution/templates/critic.md → `feat(template): add constitution-specific critic template`
- Task 2.1 → scripts/sync-schemas.sh → `chore(scripts): verify constitution schema sync`
- Task 2.2 → AGENTS.md → `docs: add constitution schema usage guide`

## Success Criteria

- [ ] All acceptance criteria pass
- [ ] All QA scenarios pass
- [ ] Scope is clean (no extra, no missing)

> See [spec.md#added-requirements](openspec/changes/schema-capabilities/specs/constitution-schema/spec.md)

<!-- Progress Tracking (Meta: sync protocol for task states) -->
- tasks.md is the single source of truth for checkbox states
- When updating a checkbox in tasks.md, immediately mirror the change in this plan's ## Tasks section
- On pause or all_done: sync checkbox states from tasks.md to this plan and update .sisyphus/boulder.json
- Do NOT use todowrite/todoread
