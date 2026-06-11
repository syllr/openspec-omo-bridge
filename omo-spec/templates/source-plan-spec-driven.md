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
schema: {{SCHEMA_NAME}}
changeName: {{CHANGE_NAME}}
generatedAt: "{{DATE}}"
targetArtifacts:
{{TARGET_ARTIFACTS_YAML}}
compilePlanOutput: .omo/plans/{{CHANGE_NAME}}.md
reviewCheckpointPolicy: per-wave-pause

---

# omo-spec Source Plan: {{CHANGE_NAME}}

> **本文件由 `omo-spec-source-plan` skill 生成,跑 `/start-work source-{{CHANGE_NAME}}` 执行。**
> 生成器版本:omo-spec 1.0 | schema:{{SCHEMA_NAME}}
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
  - `openspec validate {{CHANGE_NAME}}` 通过(specs 阶段后)
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

{{WAVES_BLOCK}}

---

## 7. Static Schemas (from `schemas/{{SCHEMA_NAME}}/schema.yaml`)

> **本章节由脚本嵌入。** 内容是 `schema.yaml` 中每个 artifact 的 `instruction` 字段全文,
> 包含 PHASE 1/2/3、Fast Fail Rule、行为约束等。`__LANG_PLACEHOLDER__` 已在生成时按 `OPENSPEC_LANG` 替换。
>
> **阅读指引**:执行第 6 章的 task 时,把对应章节的内容视为"必须遵守的行为指令"——
> 它不是参考附录,而是 schema 层面的强约束,违反会导致 OpenSpec validate 失败。

{{SCHEMAS_BLOCK}}

---

## 8. Static Templates (from `schemas/{{SCHEMA_NAME}}/templates/`)

> **本章节由脚本嵌入。** 内容是 `templates/` 目录中每个 artifact 对应的 markdown 模板全文。
>
> **阅读指引**:执行第 6 章的 task 时,把对应章节的内容视为"文件结构骨架"——
> 输出的 artifact 必须包含模板的所有 sections(即使某些 section 内容为空或简略,标题必须存在)。

{{TEMPLATES_BLOCK}}

---

## 9. Compile Plan Generation

<!-- LLM_FILL: 描述如何把第 6.1-6.3 Wave 产出的 3 个 artifacts(proposal/design/specs)翻译成 compile plan 的 9 章节。compile plan 输出到 `.omo/plans/{{CHANGE_NAME}}.md`,供 apply 阶段 `/start-work {{CHANGE_NAME}}` 实施。 -->

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
.omo/plans/{{CHANGE_NAME}}.md
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
    /start-work source-{{CHANGE_NAME}}

  OMO 会按 ## TODOs 的 Wave 顺序逐个执行。每个 Wave 完成后:
    1. AI 报告 "Wave N completed: <产出文件路径>"
    2. AI 用 question 工具问 "是否继续 Wave N+1?"
    3. 用户 Yes → 继续 / No → 停下,等用户指示

  全部 Wave 完成后:
    1. AI 报告 "Source plan execution done. Artifacts + compile plan ready."
    2. 提示用户跑 /omo-apply-change {{CHANGE_NAME}} 进入实施阶段
-->
