# add-user-auth 示例

**目的**:展示 omo-spec 2.0 端到端流程的产物。

## 包含文件

| 文件                               | 状态      | 说明                                                                                                |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| `source-add-user-auth.skeleton.md` | ✅ 已生成 | 脚本 `gen-source-plan.ts` 输出的原始骨架(841 行,35KB),第 1-5/9 章含 `<!-- LLM_FILL: ... -->` 占位符 |
| `source-add-user-auth.md`          | ✅ 已填写 | 在骨架基础上由"LLM"填好第 1-5/9 章业务内容的最终版(用于参考)                                        |

## 怎么复现

### 1. 跑脚本生成骨架

```bash
# 前置:已创建 change
openspec new change add-user-auth

# 跑脚本
bun run omo-spec/skills/omo-spec-source-plan/scripts/gen-source-plan.ts add-user-auth
```

输出:

- `.omo/plans/source-add-user-auth.md`(与本目录的 `source-add-user-auth.skeleton.md` 内容完全相同)

### 2. LLM 填充业务内容(模拟)

实际流程中,这一步由 `/omo-spec-source-plan` skill 触发,LLM 基于对话上下文自动填第 1-5/9 章。

本示例为手工模拟(参考 `source-add-user-auth.md` ):

| 章节                       | 填充内容                                         |
| -------------------------- | ------------------------------------------------ |
| 1. TL;DR                   | "为示例项目 `add-user-auth` 添加用户认证能力..." |
| 2. Context                 | "当前项目无任何认证模块..."                      |
| 3. Work Objectives         | Must Have / Must NOT Have 各 3 条                |
| 4. Verification Strategy   | Artifact 结构 + compile plan + review checkpoint |
| 5. Execution Strategy      | Critical Path + Per-Wave Pause Policy            |
| 9. Compile Plan Generation | 仅填标题段落(9.1/9.3/9.4 是模板固定的)           |

**禁止修改的章节**:

- 第 6 章 `## TODOs`(脚本生成)
- 第 7 章 `## Static Schemas`(脚本嵌入 instruction)
- 第 8 章 `## Static Templates`(脚本嵌入 template)

### 3. 用户 review + 执行

```bash
# 用户 review .omo/plans/source-add-user-auth.md
cat .omo/plans/source-add-user-auth.md

# 跑 OMO 实施
/start-work source-add-user-auth
```

执行过程:

- Wave 1: 写 `openspec/changes/add-user-auth/proposal.md` → ❓ question → 继续
- Wave 2: 写 `openspec/changes/add-user-auth/design.md` → ❓ question → 继续
- Wave 3: 写 `openspec/changes/add-user-auth/specs/user-auth/spec.md` → ❓ question → 继续
- Wave 4: 写 `openspec/changes/add-user-auth/tasks.md` 占位 + `.omo/plans/add-user-auth.md`(compile plan)→ ❓ question → 继续

### 4. Apply 阶段(复用 1.0)

```bash
/omo-apply-change add-user-auth
```

走 1.0 的 apply 流程:

- `inspect-apply.ts add-user-auth` 拿 change 上下文(planFile 已存在)
- `/start-work add-user-auth` 实施 compile plan
- Oracle 验证 ≤ 3 轮
- `sync-plan-to-tasks.ts add-user-auth` 镜像 tasks.md

## 产物清单(期望)

执行完后,`openspec/changes/add-user-auth/` 应包含:

- `proposal.md`(由 Wave 1 写入)
- `design.md`(由 Wave 2 写入)
- `specs/user-auth/spec.md`(由 Wave 3 写入)
- `tasks.md`(由 Wave 4 写入占位 + apply 阶段 sync 镜像)

`.omo/plans/add-user-auth.md` 应包含:

- 9 章节 OMO plan(compile plan,由 Wave 4 写入)

## 文件大小

- `source-add-user-auth.skeleton.md`:35,932 字节(35KB)
- 预计 source-add-user-auth.md(填好后):~36KB(增加业务内容)
- 预计 compile plan(`.omo/plans/add-user-auth.md`):~15-25KB(取决于 specs requirement 数)

## 与 1.0 流程对比

**1.0 跑同样 change 需要的 CLI 调用**:

```bash
openspec new change add-user-auth          # 1 次
openspec instructions proposal --json      # 1 次
# LLM 写 proposal.md
openspec instructions design --json        # 1 次
# LLM 写 design.md
openspec instructions specs --json         # 1 次
# LLM 写 specs/user-auth/spec.md
openspec instructions tasks --json         # 1 次
# LLM 写 tasks.md + .omo/plans/add-user-auth.md + Oracle 审查
openspec instructions apply --json         # 1 次(apply 阶段)
# LLM 实施代码
```

**总计:6 次 fetch + 6 次 LLM 上下文切换**

**omo-spec 2.0**:

```bash
openspec new change add-user-auth          # 1 次(用户手动)
bun run gen-source-plan.ts add-user-auth   # 1 次(脚本读老 schema+template)
/omo-spec-source-plan add-user-auth        # 1 次(LLM 填业务内容)
/start-work source-add-user-auth           # 1 次(OMO 实施 source plan,4 Wave)
/omo-apply-change add-user-auth            # 1 次(1.0 复用,无新增 fetch)
```

**总计:0 次动态 fetch + 1 次脚本读 + 5 次 LLM 上下文切换**

## Caveats

1. **schema.yaml 内嵌的 9 章节示例(非问题)**:第 7.4 节(tasks.instruction 嵌入) 内部含 OMO plan 9 章节的示例 markdown 块,在产物中行号 514-566 区域出现 `## 1. TL;DR` ~ `## 9. Success Criteria` 的字面字符串。这些在 code fence 内,Markdown 渲染时不会解析为标题,更不会被 OMO 误识别——因为 OMO 不解析 plan markdown 内容(只跟踪 LLM 的 checkbox 状态)。Compile plan(Wave 4 产物)也不含 instruction 嵌入,没有这个问题。

2. **示例业务内容是手工编写的**:实际使用时,业务内容来自用户的对话上下文。本示例的 1-5/9 章填充仅供参考,不是真实生产需求。

3. **未跑完整流程**:本示例只跑了"脚本生成骨架"步骤,没有真的用 `/start-work` 跑完(那需要 OMO + 真实仓库环境)。完整流程的验证请见仓库根 `AGENTS.md` 的 Test + verify 段落。

## 进一步阅读

- `omo-spec/README.md` — omo-spec 体系介绍
- `omo-spec/DESIGN.md` — 设计决策与风险
- `omo-spec/skills/omo-spec-source-plan/SKILL.md` — 入口 skill 详细指令
