---
name: omo-apply-change
description: 触发 OpenSpec apply 阶段。跑 inspect-apply.ts 拿 change 上下文,调 OMO `/start-work <planName>` 命令实施 plan,完成 Oracle 验证 + tasks.md 镜像同步(跨 schema 通用)。
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec-omo-bridge
  version: "1.0"
---

# 1. 全局规则

## Fast Fail Rule

任何 `task()` / `tool()` / `skill()` 调用失败（超时、agent 不可用、返回错误等）：

1. 立即停止当前 Step
2. 报告「🔴 [步骤名] 中断：[调用名] 调用失败。[错误信息]」
3. 等待用户介入

禁止降级、禁止重试、禁止跳过、禁止自行替代执行。

# 2. 选 change

## 2.1 规范化为纯 change name

**用户可能给 3 种格式（含 typo），必须先 normalize 成纯 change name（如 `fix-token-heartbeat-auth`）再传给后续脚本**——`inspect-apply.ts` 直接把 `process.argv[2]` 当 `changeName`,传路径或带 `.md` 会导致 `openspec status` 查不到、planFile 拼错。

| 用户输入示例                                                                          | 规范化结果                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `fix-token-heartbeat-auth`                                                            | `fix-token-heartbeat-auth`                       |
| `fix-token-heartbeat-auth.md`                                                         | 去 `.md` → `fix-token-heartbeat-auth`            |
| `/Users/yutao/WebstormProjects/origin-seed-vc/.omo/plans/fix-token-heartbeat-auth.md` | `basename` 去 `.md` → `fix-token-heartbeat-auth` |

**规范化算法**（按顺序尝试）：

1. **去前后空白**（用户可能复制粘贴带了换行/空格）
2. **路径化**：`/foo` 或 `./foo` 或 `~/foo` 或 `C:\foo` 开头 → 视为路径
3. **取 basename**：用 `node -e "console.log(require('path').basename(process.argv[1], '.md'))" "<input>"`（或 LLM 直接字符串切最后一段 `/` 或 `\`、再去 `.md`）
4. **去扩展名**：剥掉末尾的 `.md`（大小写不敏感）
5. **空白转 `-`**：把内部空格转成 `-`（容错用户口语化输入如 `fix token heartbeat`）

**typo 容错**：规范化后先试 `openspec status --change "<normalized>" --json`,失败再走 §2.3 模糊匹配。

## 2.2 选 change 的优先级

1. **用户显式指定**（任一格式）→ §2.1 normalize 后使用
2. **从对话上下文推断**（用户前几轮提到过的 change）
3. **只有一个 active change** → 自动选
4. **推断不出 / normalize 后 `openspec status` 查不到 / 模糊** → 走 §2.3

## 2.3 模糊匹配与用户确认

跑 `openspec list --json` 拿所有 change 列表，做 fuzzy match：

- **规范化结果在列表里**（exact match）→ 直接用
- **规范化结果不在列表里但有 1 个高相似度候选**（Levenshtein 距离 ≤ 2 或公共子串 ≥ 80%）→ 报告候选（如「你是不是指 `fix-token-heartbeat-aurth`?」），等用户确认
- **多个候选或无候选** → 用 `question` 工具（`AskUserQuestion`）列出全部让用户选

**禁止**在 normalize 失败后直接报错退出 —— typo 是高频场景，必须走 fuzzy + 用户确认。

# 3. 拉 schema 状态和 change 上下文

**目的**：跑 `inspect-apply.ts <name>` 拿 change 上下文 JSON,读 `schemaName` / `contextFiles` / `planFile` / `planName` / `instruction` 后进入实施。

**调用**：

```bash
@scripts/inspect-apply.ts "<name>"
```

**输出**（单 JSON object，8 字段精简版）：

```json
{
  "changeName": "<change-name>",
  "schemaName": "spec-driven",
  "planningHome": {
    "kind": "repo",
    "root": "<project-root>",
    "changesDir": "<changes-dir>",
    "defaultSchema": "spec-driven"
  },
  "changeRoot": "<change-root>",
  "contextFiles": {
    "proposal": ["<proposal-path>"],
    "design": ["<design-path>"],
    "specs": ["<spec-path-1>", "<spec-path-2>", "<spec-path-3>"]
  },
  "planFile": "<plan-file>",
  "planName": "<plan-name>",
  "instruction": "<apply 阶段 dynamic instruction 字符串>"
}
```

**字段含义**：

- `changeName` — change 名（从 `status.changeName` 取，作权威源）
- `schemaName` — 当前用的 schema（如 `spec-driven` / `constitution`），LLM 据此路由不同工作流
- `planningHome` — 包含 `kind`（repo/workspace）/ `root`（项目根绝对路径）/ `changesDir`（changes 目录绝对路径）/ `defaultSchema`（默认 schema）
- `changeRoot` — change 根目录绝对路径
- `contextFiles` — 各 artifact 的**绝对文件路径映射**，包含 change 的所有上下文(各 schema 的 artifact 类型不同,字段名以实际返回为准)。**冲突优先级**:多个 artifact 之间冲突时,以在 `contextFiles` 中的位置为准——**越靠前的 artifact 可信度越高**
- `planFile` — plan 文件路径**校验结果**（string 类型，Node 脚本用 `fs.existsSync` 检查拼接路径是否存在）：
  - **plan 存在** → 字段值 = 拼接路径（`<planningHome.root>/.omo/plans/<changeName>.md`），LLM 可直接 Read
  - **plan 不存在** → 字段值 = `""`（空字符串），LLM 提示用户先完成 plan 阶段
- `planName` — plan 文件的**短名**（`basename(planFile, ".md")`），专供调 OMO `/start-work` 命令的 args 用
- `instruction` — apply 阶段的 dynamic instruction 全文,**不同 schema 的 instruction 是对当前 `omo-apply-change` skill 内容的补充**(内容因 schema 而异)。**冲突优先级**:与本 skill 中内容冲突时,以 `instruction` 字段为准(`instruction` 为空字符串时,本 skill 内容为唯一权威源)

读 `schemaName` / `contextFiles` / `planFile` / `planName` / `instruction` 后，进入「实施 tasks」步骤。

# 4. 实施 tasks（按 contextFiles + plan）

走流程（Read → Implement → On completion/pause）：

1. **Read context files** — 按 `contextFiles` 字段读 change 所有上下文
2. **Implement tasks (loop)** — 调 `/start-work <planName>`(传 `planName` 字段值,短名,不要传路径),让 OMO 解析 plan 驱动 task 执行。**LLM 不手动改 `tasks.md` checkbox**(由后续 sync 步骤镜像;**plan checkbox 不在此限制内**,见「Oracle 验证」步骤)。对每个 pending task：
   - 展示正在做的 task
   - 做代码改动（保持最小、聚焦）
   - 继续下一个
3. **On completion/pause** — 展示 "Tasks completed this session" + "Overall progress"，失败/暂停时原样展示错误信息

**Pause 条件：**

- Task 不清 → 询问
- 实现暴露设计问题 → 建议更新 artifacts
- 错误/阻塞 → 报告并等待
- 用户中断

# 5. Oracle 验证（最多 3 轮）

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

用 Read 工具重读 `.omo/plans/<change-name>.md`,grep 未完成模式：

```
grep -E '^#### [0-9]+\. \[ \]|^- \[ \]' .omo/plans/<change-name>.md
```

- 0 匹配 → 所有 TODOs 和 Success Criteria 都已 `[x]` 标记 → **直接退出循环**，进入「最终同步 tasks.md 镜像」步骤。即便 Oracle 报 🔴/🟡，plan checkbox 已被全部标记就不再修
- 有匹配 → 继续走下面的流程

读取 Oracle 输出的最终判定：

1. 如果 ✅ PASS → 完成
2. 如果 🔴 或 🟡 BLOCKED（**最多 3 轮**）：
   AI 用 Read/Edit 工具直接修复实现：
   - 只修复标记为 🔴/🟡 的问题，不要修改其他内容
   - 修复完成后用 read 工具重新读 4 个 artifact 路径 + 重跑 Oracle 验证
   - 超限（3 轮后仍有 🔴/🟡）→ 汇总所有剩余展示给用户
3. 如果 ⚠️ CONDITIONAL → 汇总 ⚪ 展示给用户

# 6. 最终同步 tasks.md 镜像

Oracle 验证结束后（无论 PASS / CONDITIONAL / 超限），调 skill 自带脚本(只在 apply 阶段**最后**调一次,不预防性/刷新式调):

```bash
@scripts/sync-plan-to-tasks.ts "<name>"
```

脚本把 `.omo/plans/<name>.md` 内容镜像到 `<changeRoot>/tasks.md`,加 OpenSpec 标准头部和"Plan Reference"段。

**apply 阶段 sync 只调这一次**——不要在「实施 tasks」或「Oracle 验证」步骤中"预防性"或"刷新"式地调。plan 是 single source of truth，tasks.md 是镜像，plan 没改就无需再同步。

**目的**：保证 apply 阶段结束时 tasks.md 100% 反映 plan checkbox 最终状态。归档时（`openspec archive`）能读到准确完成度。

**幂等性**：plan checkbox 没变就重复输出。3 种终态对应：

- ✅ PASS：tasks.md 显示 100% 完成
- ⚠️ CONDITIONAL：tasks.md 显示部分完成 + 残留风险已知
- 🛑 超限停止：tasks.md 显示当前完成度，保留用户后续处理
