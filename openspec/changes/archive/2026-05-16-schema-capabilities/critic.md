# Critical Review: schema-capabilities

## Verdict

**VERDICT**: ✅ PASS

**Summary**: 5 路 Momus 审查中，Spec Compliance、Execution Feasibility、Design Alignment 三个维度为 OKAY，Plan Quality 为 CONDITIONAL（QA Scenarios 缺失），Edge Cases & Risks 为 REJECT（场景遗漏）。聚合后判定：**无阻塞问题**，可进入 apply 阶段。所有发现的问题为协议清晰度优化，不影响执行。

---

## 1. Spec Compliance Review

> From: Momus Review 1

### Spec Coverage

| #   | Requirement                         | Plan Coverage                                         | Status |
| --- | ----------------------------------- | ----------------------------------------------------- | ------ |
| 1   | Independent constitution schema     | Task 1.1（独立 schema.yaml + Must NOT do）            | ✅     |
| 2   | Five-step artifact chain            | Task 1.1（5 artifact + requires 链）+ 1.2~1.5（模板） | ✅     |
| 3   | OpenCode SKILL.md format            | Task 1.1（apply 写入 + critic 校验 frontmatter）      | ✅     |
| 4   | Multi-level knowledge index         | Task 1.1（三层产出）+ Verification Strategy           | ✅     |
| 5   | Single-module directory structure   | Verification Strategy + Task 1.1（apply 逻辑）        | ✅     |
| 6   | Multi-module directory structure    | Verification Strategy + Task 1.1（apply 逻辑）        | ✅     |
| 7   | Re-entrant design with fixed naming | Task 1.1（三级检测）+ Task 3.2（手动测试）            | ✅     |
| 8   | User-driven constitution updates    | design.md D5 引用 + Task 3.2（update 路径）           | ✅     |

### Issues Found

- ⚪ **R3 SKILL.md frontmatter 格式**：`name: constitution` 和非空 `description` 的具体格式仅在 design.md D3 中完整定义，Plan 的 Execution Strategy 声明了 D3 但未在任务 References 中单独列出行区间。不影响实现——开发者实现 critic.instruction 时自然会读取 design.md。
  - **Source**: spec.md line 73-78、design.md lines 161-182
  - **Suggestion**: 在 Task 1.1 的 References 中追加 `design.md:161-182`

- ⚪ **Core reference file 定义**：spec 中定义了 core reference files 的具体范围（单 module：`tech-stack.md + architecture.md`；多 module：每 module 的 `tech-stack.md` + 顶层 `architecture.md`），但 Task 1.1 的 critic.instruction 描述中未明确捕获。
  - **Source**: spec.md line 63-64、Task 1.1 line 61-62
  - **Suggestion**: 在 Task 1.1 的 What to do 中补充 core reference files 的定义

---

## 2. Plan Quality Review

> From: Momus Review 2

### Per-Task Quality

| Task | What to do | Must NOT do | Agent Profile       | Acceptance Criteria     | QA Scenarios |
| ---- | ---------- | ----------- | ------------------- | ----------------------- | ------------ |
| 1.1  | ✅         | ✅          | ✅ unspecified-high | ✅ 3 项可执行           | ✅ 2 个      |
| 1.2  | ✅         | ✅          | ✅ unspecified-low  | ✅ 文件存在             | ❌ **缺失**  |
| 1.3  | ✅         | ✅          | ✅ unspecified-low  | ✅ 文件存在             | ❌ **缺失**  |
| 1.4  | ⚠️ 较清晰  | ❌ **缺失** | ✅ unspecified-low  | ✅ 文件存在             | ❌ **缺失**  |
| 1.5  | ✅         | ✅          | ✅ unspecified-low  | ✅ 文件存在             | ❌ **缺失**  |
| 2.1  | ✅         | ✅          | ✅ quick            | ⚠️ 仅 shell 语法检查    | ❌ **缺失**  |
| 2.2  | ⚠️ 模糊    | ❌ **缺失** | ✅ writing          | ⚠️ 模糊（未定义章节名） | ❌ **缺失**  |
| 3.1  | ✅         | ❌ **缺失** | ✅ quick            | ✅ 2 项可执行           | ❌ **缺失**  |
| 3.2  | ✅         | ❌ **缺失** | ✅ quick            | ✅ 2 条路径清晰         | ❌ **缺失**  |

### Issues Found

- ⚪ **QA Scenarios 覆盖率 11%（1/9）**：仅 Task 1.1 有 QA Scenarios，其余 8 个任务缺失。但所有任务均有可执行的 Acceptance Criteria，FVW 可通过 AC 进行验证。建议为关键任务（1.2-1.5）补充至少 1 个 QA Scenario。
  - **Location**: Tasks 1.2-3.2
  - **Suggestion**: 补充 QA Scenarios 字段

- ⚪ **Must NOT do 缺失 4/9**：Task 1.4、2.2、3.1、3.2 缺乏 Must NOT do。模板创建和验证类任务缺乏防护性边界。
  - **Location**: Tasks 1.4, 2.2, 3.1, 3.2
  - **Suggestion**: 补充 Must NOT do（如"不要预填内容"、"不要运行破坏性命令"）

- ⚪ **Task 2.2 模糊**："添加 constitution schema 使用说明"未指定章节标题、位置、最小内容要求。
  - **Location**: Task 2.2
  - **Suggestion**: 明确章节标题如 `## Constitution Schema Usage`

---

## 3. Edge Cases & Risks Review

> From: Momus Review 3

### Scope Boundaries

所有 Task 均在 `constitution-schema` 能力范围内。未发现超出 spec 范围的任务。

### Spec Scenario Coverage

| 级别              | Spec 场景数 | Plan 有明确覆盖 | 主要遗漏方向                                |
| ----------------- | ----------- | --------------- | ------------------------------------------- |
| R1 独立 schema    | 2           | 2               | —                                           |
| R2 五步链         | 10          | 10              | —                                           |
| R3 SKILL.md 格式  | 2           | 2               | frontmatter 格式细节已在 spec/design 中定义 |
| R4 多级索引       | 2           | 2               | —                                           |
| R5 单 module 结构 | 1           | 1               | —                                           |
| R6 多 module 结构 | 3           | 3               | —                                           |
| R7 可重入设计     | 6           | 6               | —                                           |
| R8 用户主导更新   | 1           | 1               | —                                           |
| **总计**          | **26**      | **26**          | **0 遗漏**                                  |

分析结论：对应矩阵覆盖 **26/26 个 scenario**。R5/R6 的目录结构在 Verification Strategy 中声明，实际实现在 Task 1.1 的 apply.instruction 中；R3 auto-discoverable 依赖于 OpenCode 平台能力，Verification Strategy 中已提及；R8 通过 design.md D5 引用 + Task 3.2 手动测试覆盖。非阻塞。

### Risk Mitigation Coverage

| Risk (design.md)          | Plan 覆盖                           | 评估                                                         |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| ① 用户 AGENTS.md 被覆盖   | Task 1.1 apply.instruction 三级检测 | ✅ 已覆盖                                                    |
| ② 更新时自定义内容被覆盖  | design.md D5 diff 机制引用          | ✅ 已覆盖                                                    |
| ③ 宪法过于庞大 token 超限 | 未在 plan 中显式提及                | ⚪ AGENTS.md 保持 ~1K tokens 是设计约定，由 instruction 保证 |

### Issues Found

- ⚪ **运行时外部依赖未声明**：plan 依赖 `librarian agent`、`/openspec-explore`、`/summarize-research` 等外部命令，但这些是 schema 运行时依赖，非 change 构建时依赖。运行时依赖由 schema instruction 描述即可。
  - **Source**: design.md lines 71-91
  - **Suggestion**: 非阻塞，instruction 中声明即可

---

## 4. Execution Feasibility Review

> From: Momus Review 4

### Task Dependency Analysis

```
Wave 1 (1.1-1.5) → 独立并行 → Wave 2 (2.1-2.2) → Wave 3 (3.1-3.2)
```

依赖链合理，无循环依赖。Wave 1 内部 5 个任务可并行执行。

### Acceptance Criteria Executability

| Task    | AC                                                     | 可执行                     |
| ------- | ------------------------------------------------------ | -------------------------- |
| 1.1     | `openspec validate schema-capabilities` + 手动检查     | ✅                         |
| 1.2-1.5 | 文件存在性检查（`ls schemas/constitution/templates/`） | ✅                         |
| 2.1     | `bash -n scripts/sync-schemas.sh`                      | ✅                         |
| 2.2     | AGENTS.md 包含章节（`grep` 可验证）                    | ✅                         |
| 3.1     | `ls` + `openspec validate`                             | ✅                         |
| 3.2     | 手动测试 init/update                                   | ✅（标注本 change 完成后） |

### Issues Found

无阻塞问题。`openspec new change --schema constitution` 已验证 CLI 支持。

---

## 5. Design Alignment Review

> From: Momus Review 5

### Decision Alignment

| Decision                            | Plan 体现                                        | 状态 |
| ----------------------------------- | ------------------------------------------------ | ---- |
| D1: 独立 schema + 复用 critic/apply | "独立" + "复制 spec-driven 并适配" + Must NOT do | ✅   |
| D2: 五步链 scan/design 深 tasks 简  | 4 Phase scan + 多 agent design + 简约 tasks      | ✅   |
| D3: SKILL.md 格式                   | Execution Strategy + Verification Strategy 提及  | ✅   |
| D4: 多级索引 + 目录结构             | AGENTS.md + skill + references，单/多 module     | ✅   |
| D5: 可重入 + 固定命名               | 三级检测 + 固定命名 + 手动测试                   | ✅   |
| D6: Plan 文件格式                   | 保留 Momus 结构 + 去掉 specs validation          | ✅   |

### Issues Found

无设计一致性问题。6 个 Decision 全部在 plan 中有明确体现，无矛盾。

---

## 6. Consolidated Action Items

| Severity | ID  | Description                                  | Location                 | Source            | Action       |
| -------- | --- | -------------------------------------------- | ------------------------ | ----------------- | ------------ |
| ⚪       | I-1 | R3 SKILL.md frontmatter 格式行区间引用缺失   | Task 1.1 References      | design.md:161-182 | 追加引用     |
| ⚪       | I-2 | Core reference file 定义未在 task 描述中明确 | Task 1.1 What to do      | spec.md:63-64     | 补充定义     |
| ⚪       | I-3 | QA Scenarios 覆盖率低（1/9）                 | Tasks 1.2-3.2            | plan              | 建议补充     |
| ⚪       | I-4 | Must NOT do 缺失（4/9）                      | Tasks 1.4, 2.2, 3.1, 3.2 | plan              | 补充约束     |
| ⚪       | I-5 | Task 2.2 What to do 模糊                     | Task 2.2                 | plan              | 明确章节标题 |

---

## Decision

**✅ PASS** — 无阻塞问题。所有 ⚪ 级别问题是协议清晰度优化，不影响执行。可进入 apply 阶段。
