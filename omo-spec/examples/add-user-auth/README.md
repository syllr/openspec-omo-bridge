# add-user-auth 示例

**目的**:展示 omo-spec 端到端流程的产物。

## 包含文件

| 文件                               | 状态      | 说明                                                                                           |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `source-add-user-auth.skeleton.md` | ✅ 已生成 | 脚本 `gen-source-plan.ts` 输出的原始骨架(836 行),第 1-5/9 章含 `<!-- LLM_FILL: ... -->` 占位符 |

## 怎么复现

### 1. 跑脚本生成骨架

```bash
# 前置:已创建 change
openspec new change add-user-auth

# 跑脚本(选择全部 4 个 artifacts)
bun run omo-spec/skills/omo-spec/scripts/gen-source-plan.ts add-user-auth --artifacts proposal,design,spec
```

输出:

- `spec-source-add-user-auth.md`(与本目录的 `source-add-user-auth.skeleton.md` 内容完全相同)

### 2. LLM 填充业务内容(模拟)

实际流程中,这一步由 `/omo-spec` skill 触发,LLM 基于对话上下文自动填第 1-5/9 章。

**禁止修改的章节**:

- 第 6 章 `## TODOs`(脚本生成)
- 第 7 章 `## Static Schemas`(脚本嵌入 instruction)
- 第 8 章 `## Static Templates`(脚本嵌入 template)

### 3. 用户 review + 执行

```bash
# 用户 review spec-source-add-user-auth.md
cat spec-source-add-user-auth.md

# 跑 OMO 实施
/start-work spec-source-add-user-auth
```

执行过程(按用户选的 artifacts):

- Wave 1: 写 `openspec/changes/add-user-auth/proposal.md` → ❓ question → 继续
- Wave 2: 写 `openspec/changes/add-user-auth/design.md` → ❓ question → 继续
- Wave 3: 写 `openspec/changes/add-user-auth/specs/<capability>/spec.md` → ❓ question → 继续

### 4. Apply 阶段(复用 1.0)

```bash
/omo-apply-change add-user-auth
```

走 1.0 的 apply 流程:

- `inspect-apply.ts add-user-auth` 拿 change 上下文(planFile 已存在)
- `/start-work add-user-auth` 实施 compile plan
- Oracle 验证 ≤ 3 轮

## 产物清单(期望)

执行完后,`openspec/changes/add-user-auth/` 应包含:

- `proposal.md`(由 Wave 1 写入)
- `design.md`(由 Wave 2 写入)
- `specs/<capability>/spec.md`(由 Wave 3 写入,可能多个)

## Caveats

1. **示例业务内容是手工编写的**:实际使用时,业务内容来自用户的对话上下文。本示例仅供参考。

2. **未跑完整流程**:本示例只跑了"脚本生成骨架"步骤,没有真的用 `/start-work` 跑完(那需要 OMO + 真实仓库环境)。

## 进一步阅读

- `omo-spec/README.md` — omo-spec 体系介绍
- `omo-spec/DESIGN.md` — 设计决策与风险
- `omo-spec/skills/omo-spec/SKILL.md` — 入口 skill 详细指令
