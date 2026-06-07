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

## 1. 选 change

可指定 change name。省略时:

- 从对话上下文推断(用户前几轮提到过的 change)
- 只有一个 active change → 自动选
- 推断不出或模糊 → 跑 `openspec list --json`,用 AskUserQuestion 让用户选

## 2. 拉 schema 状态 + apply instruction

```bash
openspec status --change "<name>" --json
openspec instructions apply --change "<name>" --json
```

记下 `schemaName`(spec-driven / constitution)和返回的 `instruction` 字段。

## 3. 严格按 instruction 执行

instruction 字段是最高优先级指令,所有冲突步骤以它为准。完整流程都在 instruction 里。

**典型 schema 路径预览**:

- **spec-driven**(4 步):验证 plan 存在 → `/start-work .omo/plans/<name>.md` → Oracle 验证(最多 3 轮)→ `omo_spec_plan_to_tasks` tool 同步
- **constitution**(5 步):读 scan + design → 检测 INIT/APPEND/UPDATE 模式 → 写文件 + 更新 AGENTS.md → 自检 → 报告

## 4. OpenCode Tool 约定

`omo_spec_plan_to_tasks` 是 OpenCode plugin tool,走 tool 机制,不要 bash。判断口诀:snake_case 名称 + OpenCode plugin tool = 走 tool。

## 5. Fast Fail

任何 `task()` / `tool()` / `skill()` 调用失败(超时、agent 不可用、返回错误等):

1. 立即停止当前 Step
2. 报告「🔴 [步骤名] 中断:[agent/tool/skill 名] 调用失败。[错误信息]」
3. 等待用户介入
