---
name: omo-apply-change
description: 触发 OpenSpec apply 阶段。拉 schema 动态 instruction 并按其执行(spec-driven 走 OMO plan 路径;constitution 走文档生成路径)。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec-omo-bridge
  version: "1.0"
---

# 全局规则

## Fast Fail Rule

任何 `task()` / `tool()` / `skill()` 调用失败（超时、agent 不可用、返回错误等）：

1. 立即停止当前 Step
2. 报告「🔴 [步骤名] 中断：[调用名] 调用失败。[错误信息]」
3. 等待用户介入

禁止降级、禁止重试、禁止跳过、禁止自行替代执行。

## OpenCode Tool 约定

`omo_spec_plan_to_tasks` 和 `omo_spec_check_plan` 是 **OpenCode plugin tool**：

- ✅ 正确：通过 OpenCode tool 机制直接调用（工具面板自动展示 JSON 参数）
- ❌ 错误：在 bash 中执行 kebab-case 形式（如 `omo-spec-plan-to-tasks`）—— 这些不是 CLI 二进制，执行会报
  `command not found: omo-spec-plan-to-tasks`

**判断口诀**：snake_case 名称 + OpenCode plugin tool = 走 tool 机制，不要走 bash。

## 优先级

`openspec instructions apply --json` 返回的 `instruction` 字段是**最高优先级执行依据**。完整流程在 instruction 里，所有冲突步骤以
instruction 为准。

# 选 change

可指定 change name。省略时:

- 从对话上下文推断(用户前几轮提到过的 change)
- 只有一个 active change → 自动选
- 推断不出或模糊 → 跑 `openspec list --json`,用 AskUserQuestion 让用户选

# 拉 schema 状态 + apply instruction

跑 skill 自带脚本(剔除误导的 `tasks` 数组,只输出单 JSON object):

```bash
~/.config/opencode/skills/omo-apply-change/scripts/inspect-apply.mjs "<name>"
```

=== 关键：与 openspec-apply-change skill 的冲突 ===

本 apply 阶段由 `openspec-apply-change` skill 触发，但本系统使用自定义的 `spec-driven` schema，与标准 skill 的行为**完全不同
**。

**优先级声明**：本 instruction 中的所有命令优先级**高于** `openspec-apply-change` skill 的步骤。AI 必须按本 instruction
执行，**忽略** skill 中任何与本 instruction 冲突的步骤。

**绝对禁止**（如违反会产生错误的 tasks.md）：

1. ❌ 禁止**手动**重写或重新生成 `tasks.md`（无论是 `1.1` 格式还是其他格式）— tasks.md 只能由 `omo_spec_plan_to_tasks` tool
   写入（**走 tool 机制，不要 bash**）
2. ❌ 禁止读取 `tasks.md` 作为任务列表（apply 阶段读 `.omo/plans/<change-name>.md` 即可，tasks.md 是镜像）
3. ❌ 禁止**手动**标记 `tasks.md` 中的 checkbox — checkbox 由 sync tool 从 plan 镜像
4. ❌ 禁止执行 skill 的 Step 6（"Mark task complete in the tasks file"）
5. ❌ 禁止从 `openspec/changes/archive/` 等历史目录复制旧的 N.M 格式
6. ❌ 禁止调用 `openspec-apply-change` skill 中的任何写入/读取 tasks.md 的步骤（如果它被自动加载，请忽略它的所有步骤）

**唯一允许的 tasks.md 写操作**：Step 4（apply 结束前）**通过 tool 机制**调用 `omo_spec_plan_to_tasks`（**不要走 bash**）。

=== Step 1：验证 tasks 阶段已完成 ===

检查以下两个文件都存在：

- `openspec/changes/<change-name>/tasks.md`
- `.omo/plans/<change-name>.md`

任一文件不存在 → 停止，提示用户：「🔴 tasks 阶段未完成。请先完成 tasks 阶段生成 plan + tasks.md。如果尚未创建 change，请先运行
`openspec new change --schema spec-driven <change-name>`。」

=== Step 2：执行 /start-work ===

直接调用：

```
/start-work .omo/plans/<change-name>.md
```

这是 apply 阶段唯一的执行动作——不要把它描述为"动态指令"或"按 apply 阶段..."，**直接执行**。
/start-work 是 OMO 内置命令，调用后由 OMO 自行解析 plan 并驱动 task 执行。

**结果处理：**

1. 正常完成 → 进入 Step 3（Oracle 验证）
2. 暂停（部分 task 未完成）→ 进入 Step 3（先验证，结束后 Step 4 统一同步）
3. 失败 → 把错误信息**原样**展示给用户，等待介入。不要猜测失败原因。

=== Step 3：Oracle 验证（最多 3 轮）===

/start-work 完成后，调用 Oracle agent 审查 change（artifacts 正确性 + plan 任务完成度）：

```
task(subagent_type="oracle", prompt="审查 OpenSpec change '<change-name>' 的实现产出。你有 read 工具和 bash 工具，请自行读 artifacts、plan 文件和执行 git diff。

**两件事**：

1. **5 维度审查**：按 Spec 合规性 / Design 对齐 / Proposal 范围 / 非功能性合规性输出发现，标注 🔴阻塞 / 🟡警告 / ⚪建议，对每个 🔴 给出具体修复建议。

2. **Plan 任务完成度审计**：读 `.omo/plans/<change-name>.md`，对两类项分别判断是否实际完成：
   - TODOs section 的 `#### N. [ ]` 任务（不含 FVW `### FN. [ ]`）
   - Success Criteria section 的 `- [ ]` 验收项

   根据 artifacts + git diff + evidence 判断，返回结构化清单：
   ```

PLAN_UPDATES:

- section: todos
  task: 1.1 [ ] 创建 foo.ts
  status: completed
  evidence: 文件已存在 + 包含 export function foo
- section: todos
  task: 1.2 [ ] 添加测试
  status: incomplete
  reason: 缺少 test 目录
- section: success_criteria
  task: - [ ] 修复通知丢失 bug
  status: completed
  evidence: git diff 中已删除 OpenCodeNotificationRouter.notify 的第一个 ?: return
- section: success_criteria
  task: - [ ] 多项目 SSE 真正可用
  status: incomplete
  reason: OpenCodeServerManager 仍有 stop 旧 consumer 调用

   ```
   status 仅 `completed` / `incomplete`（不含 `in_progress`——本审计只区分 done / not done）。")
```

**处理 PLAN_UPDATES**：对 Oracle 标 `completed` 的每项，用 Read + Edit 工具把 plan 中对应 checkbox 改 `[x]`：

- TODOs section：`#### N. [ ]` → `#### N. [x]`
- Success Criteria section：`- [ ]` → `- [x]`

**循环退出条件**（每轮修复前先检查）：
用 Read 工具重读 `.omo/plans/<change-name>.md`,grep 未完成模式:

```
grep -E '^#### [0-9]+\. \[ \]|^- \[ \]' .omo/plans/<change-name>.md
```

- 0 匹配 → 所有 TODOs 和 Success Criteria 都已 `[x]` 标记 → **直接退出循环**，进入 Step 4 同步。
  即便 Oracle 报 🔴/🟡，plan checkbox 已被全部标记就不再修。
- 有匹配 → 继续走下面的流程。

读取 Oracle 输出的最终判定：

1. 如果 ✅ PASS → 完成
2. 如果 🔴 或 🟡 BLOCKED（**最多 3 轮**）：
   AI 用 Read/Edit 工具直接修复实现：
   只修复标记为 🔴/🟡 的问题，不要修改其他内容。
   Oracle 验证结果中的所有 🔴/🟡 问题：
   [将 Oracle 输出的 🔴/🟡 问题列表及修复建议填入此处]
   修复完成后用 read 工具重新读 4 个 artifact 路径 + 重跑 Oracle 验证
   超限（3 轮后仍有 🔴/🟡）→ 汇总所有剩余展示给用户
3. 如果 ⚠️ CONDITIONAL → 汇总 ⚪ 展示给用户

**注意**：Step 4 的 `omo_spec_plan_to_tasks` tool 调用（**走 tool 机制，不要 bash**）是 apply 阶段**唯一**的 tasks.md 写操作。
任务完成状态通过 sync tool 从 plan 文件的 checkbox 镜像而来。

=== Step 4：最终同步 tasks.md 镜像 ===

Step 3 验证结束后（无论 PASS / CONDITIONAL / 超限），**最终**通过 OpenCode tool 机制调用一次 `omo_spec_plan_to_tasks`（batch
模式无参，**不要走 bash**）同步所有 plan 状态到 tasks.md。

**apply 阶段 sync tool 只调这一次**——不要在 Step 1/2/3 中"预防性"或"刷新"式地调。plan 是 single source of truth,tasks.md
是镜像,plan 没改就无需再同步。

**目的**：保证 apply 阶段结束时 tasks.md 100% 反映 plan checkbox 最终状态。归档时（`openspec archive`）能读到准确完成度。

**幂等性**：plan checkbox 没变就重复输出。3 种终态对应：

- ✅ PASS：tasks.md 显示 100% 完成
- ⚠️ CONDITIONAL：tasks.md 显示部分完成 + 残留风险已知
- 🛑 超限停止：tasks.md 显示当前完成度，保留用户后续处理

完整生命周期（tasks → apply）：

1. tasks 阶段：生成 plan（PHASE 3）+ plan 审查 + verdict 内联处理（PHASE 4）+ 调 sync tool 生成 tasks.md 镜像（PHASE 5）
2. apply Step 4（本步）：sync tool 最终同步（apply 结束之前）
