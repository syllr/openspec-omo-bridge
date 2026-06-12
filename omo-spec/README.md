# omo-spec

**OpenSpec + OMO** — 把 OpenSpec 静态 spec-driven 工作流桥接到 OMO plan 执行,消除动态 fetch 开销。

## 这是什么

`omo-spec` 是一个**独立体系**,通过把 OpenSpec 的 instruction 和 template 静态嵌入到一个 OMO 9 章节 plan(source plan),让 LLM 一次性写完所有选中的 artifacts + compile plan,而不是分多次 fetch CLI 返回的 instruction。

**核心收益**:

| 维度                    | 原流程                                                    | omo-spec 流程                 |
| ----------------------- | --------------------------------------------------------- | ----------------------------- |
| OpenSpec CLI fetch 次数 | 4-5 次(每 artifact 一次 + apply 一次)                     | **0 次**                      |
| LLM 注意力分散点        | 3-4 个(SKILL.md ↔ CLI JSON ↔ instruction 字段 ↔ template) | **1 个**(source plan 自身)    |
| 入口 skill 数           | 11 个(`/openspec-new-change` 等)                          | **1 个**(`/omo-spec`)         |
| Artifact 选择           | 固定 4 个                                                 | **用户选择**(可多选,按依赖树) |
| Apply 阶段              | 调 `/omo-apply-change`(再 fetch 一次)                     | 复用 `/omo-apply-change`      |

## 与原流程关系

**原流程完全不动**:

- `.opencode/skills/openspec-*`(11 个 skill)
- `schemas/spec-driven/`、`schemas/constitution/`
- `skills/omo-apply-change/`
- `openspec/config.yaml`
- 根 `AGENTS.md`

`omo-spec` 是一个**独立目录**,平行存在,通过 OMO plan 机制复用基础设施,不动任何老文件。

## 目录结构

```
omo-spec/                                                # 完全独立,不碰任何老文件
├── README.md                                            # 本文件
├── DESIGN.md                                            # 设计决策存档
├── artifacts/                                           # artifacts 定义(独立于老 schemas/)
│   ├── proposal/
│   │   ├── proposal.instruction                         # 从老 schema.yaml 提取(<id>.instruction 格式)
│   │   └── proposal.template                            # 从老 templates/ 复制(.template 防 OMO 误扫)
│   ├── design/
│   │   ├── design.instruction
│   │   └── design.template
│   └── spec/
│       ├── spec.instruction
│       └── spec.template
├── skills/
│   └── omo-spec/                                        # 唯一入口 skill
│       ├── SKILL.md
│       └── scripts/
│           ├── gen-source-plan.ts                       # 读 artifacts + template,生成 source plan
│           └── __tests__/
│               └── gen-source-plan.test.ts              # 46 个单元测试
├── templates/
│   └── source-plan.template                             # source plan 9 章节骨架模板(.template 防 OMO 误扫)
└── examples/
    └── add-user-auth/                                   # 端到端示例
```

## 端到端流程

```
┌────────────────────────────────────────────────────────────────┐
│ 用户: "用 omo-spec 流程做一个添加用户认证的功能"                │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ /omo-spec add-user-auth                                        │
│  ├─ Step 1: 解析输入(changeName = add-user-auth)               │
│  ├─ Step 2: 按依赖树逐轮选择 artifacts                         │
│  │   └─ ❓ question: "请选择要生成哪些 artifacts"              │
│  ├─ Step 3-4: 校验(change 是否存在)                            │
│  ├─ Step 5: 调 gen-source-plan.ts                              │
│  │   ├─ 读 omo-spec/artifacts/<name>/instruction.<name> (只读) │
│  │   ├─ 读 omo-spec/artifacts/<name>/<name>.template (只读)    │
│  │   └─ 写 spec-source-add-user-auth.md                  │
│  │       (7/8 章已填,1-5/9 章待 LLM 填)                       │
│  ├─ Step 6: 读取生成的 source plan                             │
│  ├─ Step 7: LLM 填充第 1-5/9 章业务内容(基于对话上下文)        │
│  └─ Step 8-9: 写入 + 报告 + STOP                              │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼ (用户 review source plan)
┌───────────────────────────────────────────────────────────────┐
│ /start-work spec-source-add-user-auth                              │
│  ├─ 读 source plan (instruction 已静态嵌入)                   │
│  ├─ Wave 1: 写 proposal.md                                    │
│  │   └─ ❓ question: "Wave 1 完成,继续?"                      │
│  ├─ Wave 2: 写 design.md                                      │
│  ├─ Wave 3: 写 specs/<capability>/spec.md (N 个)             │
│  └─ 完成                                                        │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ /omo-apply-change add-user-auth  (1.0 的 skill,直接复用)     │
│  ├─ inspect-apply.ts add-user-auth (plan 已存在)              │
│  ├─ /start-work add-user-auth (实施 compile plan)             │
│  ├─ Oracle 验证 (≤3 轮)                                       │
│  └─ 完成                                                        │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ /openspec-archive-change add-user-auth (1.0 复用)            │
└────────────────────────────────────────────────────────────────┘
```

## 使用方式

### 1. 调用入口 skill

```bash
/omo-spec <change-name>
```

示例:

```bash
/omo-spec add-user-auth
```

skill 会列出可用 artifacts,让你选择要生成哪些。

### 2. 跑生成的 source plan

```bash
# 用户 review spec-source-add-user-auth.md
# 确认无误后,跑 OMO 实施:
/start-work spec-source-add-user-auth
```

### 3. 进入 apply 阶段(复用 1.0)

```bash
/omo-apply-change add-user-auth
```

## 关键概念

### Artifacts(可选)

`omo-spec/artifacts/` 目录下定义了可用的 artifacts:

| Artifact   | 说明                                                     |
| ---------- | -------------------------------------------------------- |
| `proposal` | 初始提案文档(Why / What Changes / Capabilities / Impact) |
| `design`   | 技术设计文档(Context / Goals / Decisions / Risks)        |
| `spec`     | 详细规格说明(Requirements + Scenarios)                   |

每个 artifact 目录包含:

- `<id>.instruction` — 行为约束(PHASE 1/2/3、Fast Fail Rule 等)
- `<id>.template` — 文件结构骨架(`.template` 后缀防 OMO 误扫)

**用户选择**:调用 `/omo-spec` 时,按依赖树逐轮选择 artifacts。

### Source Plan(核心)

`spec-source-<change-name>.md` 是一个 **OMO 9 章节 plan**,但不是用来实施代码的——而是用来**生成 OpenSpec artifacts + compile plan**的"meta-plan"。

| 章节                       | 内容                                         | 生成者   |
| -------------------------- | -------------------------------------------- | -------- |
| 1. TL;DR                   | 一句话概述                                   | LLM      |
| 2. Context                 | 背景信息                                     | LLM      |
| 3. Work Objectives         | Must Have / Must NOT Have                    | LLM      |
| 4. Verification Strategy   | 验证手段                                     | LLM      |
| 5. Execution Strategy      | 关键路径 / 并发约束                          | LLM      |
| 6. TODOs                   | N 个 Wave(每个对应 1 个 artifact)            | **脚本** |
| 7. Static Schemas          | 每个 artifact 的 instruction 全文            | **脚本** |
| 8. Static Templates        | 每个 artifact 的 template 全文               | **脚本** |
| 9. Compile Plan Generation | 翻译规则(如何把 artifacts 变成 compile plan) | LLM      |

### Compile Plan(产物)

`.omo/plans/<change-name>.md` 是 source plan 执行后产出的**真正 OMO 实施 plan**,由 source plan 的最后 1 个 Wave 生成。它会被 1.0 的 `/omo-apply-change` skill 通过 `inspect-apply.ts` 识别,然后 `/start-work` 实施代码改动。

## 验证

```bash
# 跑单元测试(34 个测试覆盖核心纯函数)
bun test omo-spec/skills/omo-spec/scripts/__tests__/gen-source-plan.test.ts
```

## 兼容性

**omo-spec 与 1.0 100% 兼容产物**:

- 3 个 OpenSpec artifact 文件格式完全相同(proposal.md / design.md / specs/\*.md)
- `openspec validate`、`openspec status`、`openspec archive` 都能跑
- apply 阶段复用 1.0 的 `/omo-apply-change` skill

**omo-spec 不引入**:

- 新的 OpenSpec schema
- 新的 OpenSpec CLI 命令
- 新的产物格式
- 对老文件的任何修改

## 进一步阅读

- [`omo-spec/DESIGN.md`](./DESIGN.md) — 完整设计决策 + 选型理由
- [`omo-spec/skills/omo-spec/SKILL.md`](./skills/omo-spec/SKILL.md) — 入口 skill 详细指令
- [`omo-spec/examples/add-user-auth/`](./examples/add-user-auth/) — 端到端示例
