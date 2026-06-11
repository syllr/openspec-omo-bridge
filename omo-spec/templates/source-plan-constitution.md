# omo-spec Source Plan Template — constitution schema

> 本文件是 `gen-source-plan.ts` 脚本读取的骨架模板,用于生成 `.omo/plans/source-<change-name>.md`(constitution schema)。
> constitution schema 只有 2 个 artifacts(scan → design),apply 阶段在 OpenSpec 端由 `omo-apply-change` skill 处理。
> 脚本只替换 `{{...}}` 占位符,不动 `<!-- LLM_FILL: ... -->` 标记。
>
> **LLM 填充规则**:同 spec-driven 模板(详见 source-plan-spec-driven.md 头部说明)。

---

<!--
  ═══════════════════════════════════════════════════════════════════
  constitution schema 与 spec-driven 的差异
  ═══════════════════════════════════════════════════════════════════
  - 2 个 artifacts: scan → design(no specs, no tasks placeholder)
  - apply 阶段产出 docs/constitution/<dimension>/*.md + 更新 AGENTS.md
  - 编译 compile plan 的输入是 scan + design(2 个 artifacts,不是 3 个)
  - 第 9 章的"翻译映射"表需要适配 constitution 的 2-artifact 流
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

# omo-spec Source Plan: {{CHANGE_NAME}} (constitution)

> **本文件由 `omo-spec-source-plan` skill 生成,跑 `/start-work source-{{CHANGE_NAME}}` 执行。**
> 生成器版本:omo-spec 1.0 | schema:{{SCHEMA_NAME}}(constitution 流,2 artifacts)
> 阅读时长:预计 2-3 分钟 | 执行时长:预计 5-15 分钟(2 个 Wave,每 Wave 1 个 artifact)

---

## 1. TL;DR

<!-- LLM_FILL: 用 1 句话概述本次宪法变更做什么(新增哪个维度的规范) -->

_(待 LLM 填充)_

---

## 2. Context

<!-- LLM_FILL: 2-3 句话说明背景:为什么需要新增这个维度的宪法,当前缺少什么 -->

_(待 LLM 填充)_

---

## 3. Work Objectives

<!-- LLM_FILL: 列出本次变更的 Must Have / Must NOT Have -->

- **Must Have**:
  - _(待 LLM 填充:必须达成的目标——例如:新增 <dimension> 维度的 <tech_stack> 规范)_
- **Must NOT Have**:
  - _(待 LLM 填充:明确不在范围内的事项——例如:不修改其他已有维度)_

---

## 4. Verification Strategy

<!-- LLM_FILL: 描述如何验证 2 个 OpenSpec artifacts(scan.md / design.md)生成正确 -->

- **Artifact 结构验证**:
  - `scan.md` 包含 ## Step 1-5 + ## Decision Log(详见第 7.1/8.1 节)
  - `design.md` 包含 ## Context / ## 聚焦维度 / ## 输出结构设计 / ## Open Questions(详见第 7.2/8.2 节)
- **AGENTS.md 状态验证**(apply 阶段):
  - `constitution-start` / `constitution-end` 标记存在
  - 新维度条目以 `- **<dimension>**` 格式插入
- **Review Checkpoint**:
  - 每个 Wave 完成后停下让用户 review(per-wave-pause policy)

---

## 5. Execution Strategy

<!-- LLM_FILL: 关键路径 / 并发上限 / 顺序约束 -->

- **Critical Path**: scan → design(严格顺序)
- **Max Concurrent**: 1(constitution 2 个 artifact 之间存在硬依赖)
- **Sequential Constraints**:
  - Wave 1 (scan) 必须最先完成
  - Wave 2 (design) 依赖 Wave 1 输出(读取维度选择和技术栈)
  - **Apply 阶段不在本 source plan 范围内**——由 1.0 的 `/omo-apply-change` 处理
- **Hard Failure Rule**:同 spec-driven 模板

---

## 6. TODOs

> **本章节由脚本按 schema.artifacts 顺序自动生成,LLM 不修改。**
> constitution schema 只有 2 个 artifacts,所以本章节生成 2 个 Wave(scan + design)。

{{WAVES_BLOCK}}

---

## 7. Static Schemas (from `schemas/{{SCHEMA_NAME}}/schema.yaml`)

> **本章节由脚本嵌入。** 内容是 `schema.yaml` 中 scan / design 两个 artifact 的 `instruction` 字段全文。

{{SCHEMAS_BLOCK}}

---

## 8. Static Templates (from `schemas/{{SCHEMA_NAME}}/templates/`)

> **本章节由脚本嵌入。** 内容是 `templates/scan.md` / `templates/design.md` 全文。

{{TEMPLATES_BLOCK}}

---

## 9. Compile Plan Generation

<!-- LLM_FILL: 描述如何把 scan + design 2 个 artifacts 翻译成 compile plan 的 9 章节。compile plan 输出到 `.omo/plans/{{CHANGE_NAME}}.md`,供 apply 阶段 `/start-work {{CHANGE_NAME}}` 实施(由 1.0 的 omo-apply-change skill 调用)。 -->

### 9.1 翻译映射(constitution 适配)

| Compile plan 章节          | 来源 artifact + 字段                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| 1. TL;DR                   | `design.md` 的 ## 聚焦维度 一句话                                                            |
| 2. Context                 | `scan.md` 的 ## 用户需求摘要 + ## 已确认                                                     |
| 3. Work Objectives         | `scan.md` 的 ## 确认添加的维度 + ## 适用技术栈                                               |
| 4. Verification Strategy   | `design.md` 的 ## 输出结构设计(目标文件列表) + apply 阶段的 ## Step 4 自检                   |
| 5. Execution Strategy      | `design.md` 的 ## 输出结构设计 + `scan.md` 的 ## 已有条目冲突检查                            |
| 6. TODOs                   | 按 apply 阶段 ## Step 3 拆 INIT / APPEND / UPDATE 三种场景,每种 1 个 task                    |
| 7. Final Verification Wave | apply 阶段 ## Step 4 自检 4 项(目录存在 / start 标记 / end 标记 / 维度条目 / 无重复维度标题) |
| 8. Commit Strategy         | 1 commit per task,message 引用维度名                                                         |
| 9. Success Criteria        | `design.md` 的 ## 输出结构设计 目标文件全部创建 + AGENTS.md 更新完毕                         |

### 9.2 写入位置

```
.omo/plans/{{CHANGE_NAME}}.md
```

### 9.3 验证清单

- [ ] 9 个章节标题全部存在
- [ ] `## TODOs` 至少 2 个 `#### N. [ ]` task(INIT/APPEND/UPDATE 三种,可能只有 1 种适用)
- [ ] `## Final Verification Wave` 至少 3 个 `### FN. [ ]` 项(目录/标记/条目/无重复)
- [ ] 每个 task 含 What to do / Must NOT do / Agent Profile / References / Acceptance Criteria
- [ ] `Acceptance Criteria` 至少 1 个可执行命令(`ls`、`grep`、`test` 等)

### 9.4 关键差异(对比 spec-driven)

- **没有 specs/** — constitution 不写 spec 文件
- **没有独立的 tasks.md** — apply 阶段由 `omo-apply-change` 调 `sync-plan-to-tasks.ts` 镜像
- **AGENTS.md 是核心产物** — apply 阶段必须更新 `constitution-start/end` 区域

### 9.5 不需要的事

- 不调 `openspec instructions`(compile plan 不再 fetch CLI)
- 不创建 `docs/constitution/<dimension>/` 目录(apply 阶段的事,本阶段不做)
- 不修改 AGENTS.md(apply 阶段的事,本阶段不做)

---

<!--
  ═══════════════════════════════════════════════════════════════════
  执行模式
  ═══════════════════════════════════════════════════════════════════

  用户 review 完本 source plan 后,跑:
    /start-work source-{{CHANGE_NAME}}

  OMO 会按 ## TODOs 的 Wave 顺序逐个执行(本 schema 只有 2 个 Wave):
    Wave 1: scan.md
    Wave 2: design.md

  每个 Wave 完成后:
    1. AI 报告 "Wave N completed: <产出文件路径>"
    2. AI 用 question 工具问 "是否继续 Wave N+1?"
    3. 用户 Yes → 继续 / No → 停下

  全部 Wave 完成后:
    1. AI 报告 "Source plan execution done. 2 artifacts + compile plan ready."
    2. 提示用户跑 /omo-apply-change {{CHANGE_NAME}} 进入 apply 阶段
       (apply 阶段会读 compile plan,实施 docs/constitution/<dimension>/*.md 创建 + AGENTS.md 更新)
-->
