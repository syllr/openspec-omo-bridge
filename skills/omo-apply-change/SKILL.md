---
name: omo-apply-change
description: 触发 OpenSpec apply 阶段。拉 schema 动态 instruction 并按其执行(spec-driven 走 OMO plan 路径;constitution 走文档生成路径)。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec-omo-bridge
  version: "1.0"
---

# omo-apply-change

## 0. 全局规则

### 0.1 Fast Fail Rule

任何 `task()` / `tool()` / `skill()` 调用失败（超时、agent 不可用、返回错误等）：

1. 立即停止当前 Step
2. 报告「🔴 [步骤名] 中断：[调用名] 调用失败。[错误信息]」
3. 等待用户介入

禁止降级、禁止重试、禁止跳过、禁止自行替代执行。

### 0.2 OpenCode Tool 约定

`omo_spec_plan_to_tasks` 和 `omo_spec_check_plan` 是 **OpenCode plugin tool**：

- ✅ 正确：通过 OpenCode tool 机制直接调用（工具面板自动展示 JSON 参数）
- ❌ 错误：在 bash 中执行 kebab-case 形式（如 `omo-spec-plan-to-tasks`）—— 这些不是 CLI 二进制，执行会报 `command not found: omo-spec-plan-to-tasks`

**判断口诀**：snake_case 名称 + OpenCode plugin tool = 走 tool 机制，不要走 bash。

### 0.3 优先级

`openspec instructions apply --json` 返回的 `instruction` 字段是**最高优先级执行依据**。完整流程在 instruction 里，所有冲突步骤以 instruction 为准。

## 1. 选 change

可指定 change name。省略时:

- 从对话上下文推断(用户前几轮提到过的 change)
- 只有一个 active change → 自动选
- 推断不出或模糊 → 跑 `openspec list --json`,用 AskUserQuestion 让用户选

## 2. 拉 schema 状态 + apply instruction

跑 skill 自带脚本(剔除误导的 `tasks` 数组,只输出单 JSON object):

```bash
~/.config/opencode/skills/omo-apply-change/scripts/inspect-apply.mjs "<name>"
```

脚本内部封装 `openspec instructions apply --change "<name>" --json` + 字段过滤:

- 输出 `schemaName` / `state` / `progress{total,complete,remaining}` / `contextFiles` / 完整 `instruction`
- **剔除** `tasks` 数组(只来自 plan 的 `## 9. Success Criteria`,≠ 执行清单)

读 `instruction` 字段(完整保留),进入 §3。

## 3. 严格按 instruction 执行

**典型 schema 路径预览**:

- **spec-driven**(4 步):验证 plan 存在 → `/start-work .omo/plans/<name>.md` → Oracle 验证(最多 3 轮)→ `omo_spec_plan_to_tasks` tool 同步
- **constitution**(5 步):读 scan + design → 检测 INIT/APPEND/UPDATE 模式 → 写文件 + 更新 AGENTS.md → 自检 → 报告
