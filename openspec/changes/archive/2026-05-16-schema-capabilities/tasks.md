## Tasks

### Wave 1: Schema 定义

 - [x] 1.1 创建 `schemas/constitution/schema.yaml`
      **What to do**:
      定义五个 artifact（scan → design → tasks → critic → apply）及其 instruction、template、requires、generates 字段。- `scan.instruction`：需包含 4 个 Phase（项目检测→用户对话→并行调研→汇总），处理已有项目 vs 空项目两条路径，调度 3~5 个 librarian agent 并发调研 - `design.instruction`：基于确认的技术栈并发调研最佳实践，调用 `/summarize-research`，通过 question tool 询问是否同步宪法与代码（可选）- `tasks.instruction`：2 项基础任务（修改 AGENTS.md + 创建/更新 constitution skill）+ 1 项可选任务（修复代码违规）- `critic.instruction`：复制 `schemas/spec-driven/schema.yaml` 的 critic.instruction 并适配——去掉 `openspec validate` 步骤，质量门禁改为检查：frontmatter 格式（blocking）、AGENTS.md 章节存在（blocking）、core references 存在（warning）、引用完整性（warning）- `apply.instruction`：复制 spec-driven 的 apply.instruction 并适配——写入目标改为 AGENTS.md + skill 文件，保留 eager sync + diff 一致性验证；实现三级 init/update/incomplete 检测 - `apply.tracks: tasks.md` 与 spec-driven 一致 - `requires`：scan 空，design → [scan]，tasks → [design]，critic → [tasks]，apply → [critic]

      **Must NOT do**:
      - 不要修改 `schemas/spec-driven/` 下的任何文件
      - instruction 不要硬编码路径或假设特定语言

      **Recommended Agent Profile**: category="unspecified-high", load_skills=[]

      **References**:
      - `schemas/spec-driven/schema.yaml` — 参考 artifact 结构（id/generates/template/instruction/requires）
      - `design.md:46-137` — Decision 2 五步链详情
      - `design.md:64-93` — scan 4 Phase 分层
      - `design.md:229-260` — Decision 5 可重入设计
      - `design.md:262-288` — Decision 6 plan 文件格式

      **Acceptance Criteria**:
      - `openspec validate schema-capabilities` 通过
      - schema.yaml 中 5 个 artifact 的 `requires` 链正确：scan(空) → design(scan) → tasks(design) → critic(tasks) → apply(critic)
      - 每个 artifact 有 id/generates/template/instruction/requires 五个字段

      **QA Scenarios**:
      - Scenario: 依赖链验证 / Steps: 检查 schema.yaml 的 requires 字段 / Expected: 形成无环有向图
      - Scenario: instruction 完整性 / Steps: 检查每个 artifact 的 instruction 存在且非空 / Expected: 5 个 instruction 全部有内容

      **Evidence**: .sisyphus/evidence/task-1.1-schema-yaml.md

 - [x] 1.2 创建 `schemas/constitution/templates/scan.md`
      **What to do**:
      创建 scan 阶段的模板文件，遵循 spec-driven 的骨架风格（HTML comment 占位符不做预填充）。
      模板应引导 AI 输出结构化技术栈分析报告，含：项目检测结果、用户对话记录、调研汇总、技术栈决策记录。

      **Must NOT do**:
      - 不要预填技术栈内容（模板是骨架，内容由 instruction 运行时生成）

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - `schemas/spec-driven/templates/proposal.md` — 参考骨架风格

      **Acceptance Criteria**:
      - 文件存在于 `schemas/constitution/templates/scan.md`
      - 模板使用 HTML comment 占位符，无实际内容预填

      **Evidence**: .sisyphus/evidence/task-1.2-scan-template.md

 - [x] 1.3 创建 `schemas/constitution/templates/constitution-design.md`
      **What to do**:
      创建 design 阶段的模板，引导 AI 输出宪法结构设计文档。
      包含：技术栈列表、各技术栈最佳实践参考、宪法章节结构、目录布局（单 module / 多 module）。

      **Must NOT do**:
      - 不要预填具体技术栈或规范内容

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - `schemas/spec-driven/templates/design.md` — 参考骨架风格

      **Acceptance Criteria**:
      - 文件存在于 `schemas/constitution/templates/constitution-design.md`

      **Evidence**: .sisyphus/evidence/task-1.3-design-template.md

 - [x] 1.4 创建 `schemas/constitution/templates/tasks.md`
      **What to do**:
      创建 constitution 专用版 tasks 模板。继承 spec-driven 的 Wave 分组 + checkbox 结构，适配"2 项基础 + 1 项可选"场景。
      模板应体现：修改 AGENTS.md 的 `## Constitution` 章节、创建/更新 `.opencode/skills/constitution/` 下的 skill 和 references、可选（修复代码违规）。

      **Must NOT do**:
      - 不要预填具体路径细节

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - `schemas/spec-driven/templates/tasks.md` — 参考结构
      - `design.md:120-136` — tasks 阶段说明

      **Acceptance Criteria**:
      - 文件存在于 `schemas/constitution/templates/tasks.md`

      **Evidence**: .sisyphus/evidence/task-1.4-tasks-template.md

 - [x] 1.5 创建 `schemas/constitution/templates/critic.md`
      **What to do**:
      创建 constitution 专用版 critic 模板。保留 5 路 Momus 审查报告结构，去掉 specs validation 引用。
      审查维度改为：constitution 产出质量（frontmatter、AGENTS.md 章节、references 完整性）。

      **Must NOT do**:
      - 不要引用 proposal 或 specs（constitution 没有这些 artifact）

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - `schemas/spec-driven/templates/critic.md` — 参考审查报告结构
      - `design.md:262-288` — Decision 6 plan 格式

      **Acceptance Criteria**:
      - 文件存在于 `schemas/constitution/templates/critic.md`

      **Evidence**: .sisyphus/evidence/task-1.5-critic-template.md

### Wave 2: 集成

 - [x] 2.1 更新 `scripts/sync-schemas.sh`
      **What to do**:
      sync-schemas.sh 使用 `"$REPO_SCHEMAS"/*/` 通配符遍历所有 schema 子目录，新增 `schemas/constitution/` 已被自动覆盖。
      验证脚本能正确同步 constitution schema，且不影响 spec-driven 的同步。
      如需要，添加 `--schema constitution` 参数支持单独同步 constitution。

      **Must NOT do**:
      - 不要破坏现有 spec-driven 的同步逻辑

      **Recommended Agent Profile**: category="quick", load_skills=[]

      **References**:
      - `scripts/sync-schemas.sh`

      **Acceptance Criteria**:
      - `bash -n scripts/sync-schemas.sh` 通过（shell 语法检测）
      - constitution schema 能被脚本同步

      **Evidence**: .sisyphus/evidence/task-2.1-sync-script.md

 - [x] 2.2 更新 AGENTS.md 添加 constitution schema 说明
      **What to do**:
      在项目根目录的 AGENTS.md 中添加 constitution schema 的使用说明，包括：五步 artifact 链、scan/design 流程特点、调用方式（`openspec new change --schema constitution <name>`）、可重入更新支持。

      **Must NOT do**:
      - 不要修改 constitution schema 的文件本身（AGENTS.md 中只描述如何使用）

      **Recommended Agent Profile**: category="writing", load_skills=[]

      **References**:
      - `AGENTS.md` — 现有项目文档
      - `design.md` — 设计决策概要

      **Acceptance Criteria**:
      - AGENTS.md 包含 constitution schema 的说明章节

      **Evidence**: .sisyphus/evidence/task-2.2-agents-doc.md

### Wave 3: 验证

 - [x] 3.1 schema 结构验证
      **What to do**: - 检查 schema.yaml 中 5 个 artifact 的必填字段是否完整 - 检查 5 个模板文件是否存在且格式正确 - 检查依赖链：scan(空) → design(scan) → tasks(design) → critic(tasks) → apply(critic)

      **Must NOT do**:
      - 不要在未注册 schema 的情况下尝试运行 constitution change

      **Recommended Agent Profile**: category="quick", load_skills=[]

      **Acceptance Criteria**:
      - `ls schemas/constitution/templates/` 列出 5 个模板文件
      - 依赖链无环
      - `openspec validate` 通过

      **Evidence**: .sisyphus/evidence/task-3.1-validation.md

 - [x] 3.2 手动测试指引（本 change 完成后执行）
      **What to do**:
      本 change 完成后，手动验证 constitution schema 的 init 和 update 两条路径：1. 运行 `scripts/sync-schemas.sh` 注册 constitution schema 2. 在测试项目中执行 `openspec new change --schema constitution test-init` 验证 init 路径 3. 再次执行 `openspec new change --schema constitution test-update` 验证 update 路径（检测已有的 AGENTS.md 章节和 skill 文件）

      **Must NOT do**:
      - 不要自动化此测试（schema 不存在于本 change 的 task 执行上下文中）

      **Recommended Agent Profile**: category="quick", load_skills=[]

      **Acceptance Criteria**:
      - init 路径：项目 AGENTS.md 新增 `## Constitution` 章节，`.opencode/skills/constitution/` 文件完整
      - update 路径：检测到已有文件，进入 diff 确认流程

      **Evidence**: .sisyphus/evidence/task-3.2-manual-test.md
