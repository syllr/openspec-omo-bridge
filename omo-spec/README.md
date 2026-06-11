# omo-spec

**OpenSpec + OMO 2.0** — 把 OpenSpec 静态 spec-driven 工作流桥接到 OMO plan 执行,消除 1.0 的动态 fetch 开销。

## 这是什么

`omo-spec` 是一个**与 1.0 平行的独立体系**,通过把 OpenSpec 的 schema.yaml instruction 和 templates 静态嵌入到一个 OMO 9 章节 plan(source plan),让 LLM 一次性写完全部 OpenSpec artifacts + compile plan,而不是分多次 fetch CLI 返回的 instruction。

**核心收益**:

| 维度                    | 1.0 流程                                                  | omo-spec 2.0 流程                 |
| ----------------------- | --------------------------------------------------------- | --------------------------------- |
| OpenSpec CLI fetch 次数 | 4-5 次(每 artifact 一次 + apply 一次)                     | **0 次**                          |
| LLM 注意力分散点        | 3-4 个(SKILL.md ↔ CLI JSON ↔ instruction 字段 ↔ template) | **1 个**(source plan 自身)        |
| Token 成本(估算)        | 每 artifact 2-5KB fetch × 4 + apply fetch                 | 0 fetch                           |
| 入口 skill 数           | 11 个(`/openspec-new-change` 等)                          | **1 个**(`/omo-spec-source-plan`) |
| Apply 阶段              | 调 `/omo-apply-change`(再 fetch 一次)                     | 复用 1.0 的 `/omo-apply-change`   |

## 与 1.0 关系

**1.0 完全不动**:

- `.opencode/skills/openspec-*`(11 个 skill)
- `schemas/spec-driven/`、`schemas/constitution/`
- `skills/omo-apply-change/`
- `openspec/config.yaml`
- 根 `AGENTS.md`

`omo-spec` 是一个**独立目录**,与 1.0 平行存在,通过 OMO plan 机制复用基础设施,不动任何老文件。

|                      | 1.0                                                   | omo-spec 2.0                           |
| -------------------- | ----------------------------------------------------- | -------------------------------------- |
| 入口                 | `/openspec-new-change` 等 11 个 skill                 | `/omo-spec-source-plan`(单入口)        |
| 工作流文件           | 11 个 SKILL.md                                        | 1 个 SKILL.md + 1 个 TS 脚本           |
| schema/template 存放 | 仓库根 `schemas/`                                     | **复用老 schema/template**(只读)       |
| 产物                 | openspec/changes/<n>/{proposal,design,specs,tasks}.md | **完全相同**                           |
| Apply 阶段           | `/omo-apply-change`                                   | **复用 1.0**(`/omo-apply-change` 不变) |

## 目录结构

```
omo-spec/                                                # 完全独立,不碰任何老文件
├── README.md                                            # 本文件
├── DESIGN.md                                            # 设计决策存档
├── skills/
│   └── omo-spec-source-plan/                            # 唯一入口 skill
│       ├── SKILL.md
│       └── scripts/
│           ├── gen-source-plan.ts                       # 读老 schema+template,生成 source plan 骨架
│           └── __tests__/
│               └── gen-source-plan.test.ts              # 36 个单元测试
├── templates/
│   ├── source-plan-spec-driven.md                       # spec-driven (4 artifacts) 的 source plan 模板
│   └── source-plan-constitution.md                      # constitution (2 artifacts) 的 source plan 模板
└── examples/
    └── add-user-auth/                                   # 端到端示例(待跑通)
```

## 端到端流程

```
┌────────────────────────────────────────────────────────────────┐
│ 用户: "用 omo-spec 流程做一个添加用户认证的功能,叫 add-user-auth"│
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ /omo-spec-source-plan add-user-auth                            │
│  ├─ Step 1-3: 解析输入 + 校验                                  │
│  ├─ Step 4: 调 gen-source-plan.ts 脚本                         │
│  │   ├─ 读 schemas/spec-driven/schema.yaml (只读)             │
│  │   ├─ 读 schemas/spec-driven/templates/* (只读)            │
│  │   └─ 写 .omo/plans/source-add-user-auth.md                 │
│  │       (7/8 章已填,1-5/9 章待 LLM 填)                       │
│  ├─ Step 5: 读取生成的 source plan                             │
│  ├─ Step 6: LLM 填充第 1-5/9 章业务内容(基于对话上下文)        │
│  └─ Step 7-8: 写入 + 报告 + STOP                              │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼ (用户 review source plan)
┌───────────────────────────────────────────────────────────────┐
│ /start-work source-add-user-auth                              │
│  ├─ 读 source plan (instruction 已静态嵌入)                   │
│  ├─ Wave 1: 写 proposal.md                                    │
│  │   └─ ❓ question: "Wave 1 完成,继续?"                      │
│  ├─ Wave 2: 写 design.md                                      │
│  ├─ Wave 3: 写 specs/<capability>/spec.md (N 个)             │
│  ├─ Wave 4: 写 tasks.md 占位 + .omo/plans/<name>.md           │
│  │       (compile plan)                                       │
│  └─ 完成                                                        │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ /omo-apply-change add-user-auth  (1.0 的 skill,直接复用)     │
│  ├─ inspect-apply.ts add-user-auth (plan 已存在)              │
│  ├─ /start-work add-user-auth (实施 compile plan)             │
│  ├─ Oracle 验证 (≤3 轮)                                       │
│  └─ sync-plan-to-tasks.ts add-user-auth (tasks.md 镜像)       │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ /openspec-archive-change add-user-auth (1.0 复用)            │
└────────────────────────────────────────────────────────────────┘
```

## 使用方式

### 1. 安装(项目级)

`omo-spec` 不需要"部署"到全局——它是仓库根的独立目录,直接用:

```bash
# 仓库内
ls omo-spec/                                              # 看到这个目录就 OK
```

### 2. 调用入口 skill

```bash
/omo-spec-source-plan <change-name> [--schema <name>]
```

示例:

```bash
/omo-spec-source-plan add-user-auth
/omo-spec-source-plan refactor-auth-flow --schema spec-driven
/omo-spec-source-plan add-constitution-dimension --schema constitution --lang zh
```

### 3. 跑生成的 source plan

```bash
# 用户 review .omo/plans/source-add-user-auth.md
# 确认无误后,跑 OMO 实施:
/start-work source-add-user-auth
```

### 4. 进入 apply 阶段(复用 1.0)

```bash
/omo-apply-change add-user-auth
```

## 关键概念

### Source Plan(核心)

`.omo/plans/source-<change-name>.md` 是一个 **OMO 9 章节 plan**,但不是用来实施代码的——而是用来**生成 OpenSpec artifacts + compile plan**的"meta-plan"。

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

**关键设计**:第 6 章的每个 Wave task 显式引用第 7/8 章(`Embedded Reference: 第 7.1 节 + 第 8.1 节`),强制 LLM 把嵌入的 instruction 当作"行为约束"读——这才是 2.0 解决注意力分散的核心技巧。

### Compile Plan(产物)

`.omo/plans/<change-name>.md` 是 source plan 执行后产出的**真正 OMO 实施 plan**,由 source plan 的 Wave 4 阶段生成。它会被 1.0 的 `/omo-apply-change` skill 通过 `inspect-apply.ts` 识别,然后 `/start-work` 实施代码改动。

### 命名约定

- `source-<name>.md` — source plan(用 OMO 实施,产出 OpenSpec artifacts)
- `<name>.md` — compile plan(用 OMO 实施,产出代码改动)

OMO 不区分 source/compile,纯靠命名约定。

## 验证

```bash
# 跑单元测试(36 个测试覆盖核心纯函数)
bun test omo-spec/skills/omo-spec-source-plan/scripts/__tests__/gen-source-plan.test.ts

# 端到端示例(待完成)
ls omo-spec/examples/add-user-auth/
```

## 兼容性

**omo-spec 2.0 与 1.0 100% 兼容产物**:

- 4 个 OpenSpec artifact 文件格式完全相同(proposal.md / design.md / specs/\*.md / tasks.md)
- `openspec validate`、`openspec status`、`openspec archive` 都能跑
- apply 阶段复用 1.0 的 `/omo-apply-change` skill
- 任何 1.0 工具(inspect-apply.ts / sync-plan-to-tasks.ts / omo-apply-change/SKILL.md)都不需要改

**omo-spec 2.0 不引入**:

- 新的 OpenSpec schema
- 新的 OpenSpec CLI 命令
- 新的产物格式
- 对老文件的任何修改

## 进一步阅读

- [`omo-spec/DESIGN.md`](./DESIGN.md) — 完整设计决策 + 选型理由
- [`omo-spec/skills/omo-spec-source-plan/SKILL.md`](./skills/omo-spec-source-plan/SKILL.md) — 入口 skill 详细指令
- [`omo-spec/examples/add-user-auth/`](./examples/add-user-auth/) — 端到端示例(待跑通)
