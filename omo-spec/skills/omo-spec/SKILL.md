---
name: omo-spec
description: omo-spec 入口。按依赖树列出 artifacts, 用户逐轮选择后脚本生成 spec/<name>/ 目录(复制 template.md) + spec-source-<name>.md plan(OMO 9 章节格式), 跑 /start-work 一次性生成所有 artifacts。
metadata:
  author: omo-spec
  version: "1.0"
---

# omo-spec

**职责**:为指定 OpenSpec change 生成 source plan + spec 目录,让 LLM 按 plan 一次性写完所有选中的 artifacts。

**调用**:`/omo-spec <change-name>`

**产物**:

- `spec/<change-name>/` 目录(每个选中 artifact 一个 `<id>.md` 模板文件,脚本从 `omo-spec/artifacts/<id>/template.md` 复制)
- `spec-source-<change-name>.md` plan 文件(OMO 9 章节格式,章节标题用 `## TL;DR` / `## Context` / `## Work Objectives` 等真实 OMO 风格)
- plan 中的 `<TODO: ...>` 占位符由 LLM 替换为业务内容

**流程**:

1. 解析 change name(从用户输入或对话上下文推断)
2. 按依赖树逐轮列出 artifacts,让用户选择
3. 调脚本生成 spec 目录 + source plan
4. LLM 替换 plan 中的 `<TODO: ...>` 占位符为业务内容
5. 用户跑 `/start-work spec-source-<change-name>` 一次性生成所有选中的 artifacts

---

## Steps(严格按顺序执行,每步失败立即停止)

### Step 1: 解析 change name

**优先级**:

1. 用户显式提供 → 直接使用
2. 从对话上下文推断 → 总结出 2-3 个候选,用 `question` 工具让用户选
3. 推断不出 → 用 `question` 工具问用户

**校验**:

- change 名必须是 kebab-case(小写字母+数字+连字符)
- 若用户给的格式不规范(如 `Add User Auth` / `addUserAuth`),用 `/(?=[A-Z])| /` 拆分转 kebab-case 后告知用户

### Step 2: 按依赖树逐轮选择 artifacts

`omo-spec/artifacts/` 目录下每个 artifact 有一个 `instruction.md`,头部包含 `requires: [...]` 字段(列表)。

**依赖树构建**:

1. 扫描 `omo-spec/artifacts/*/instruction.md`,解析每个 artifact 的 `requires` 字段
2. 构建依赖树:root 节点 = requires 为空的 artifacts

**逐轮选择**:

```
第 1 轮:列出 root 节点(requires 为空的 artifacts)
┌─────────────────────────────────────────────────────────┐
│ 可用 artifacts(第 1 轮,root 节点):                      │
│                                                         │
│ 1. proposal — 初始提案文档(Why / What Changes / ...)    │
│ 2. xxx      — ...                                       │
│                                                         │
│ 0. 流程终结(不再选择更多 artifacts)                      │
└─────────────────────────────────────────────────────────┘
用户选择: 1

第 2 轮:列出依赖 proposal 的 artifacts
┌─────────────────────────────────────────────────────────┐
│ 依赖 proposal 的 artifacts:                             │
│                                                         │
│ 1. design — 技术设计文档(Context / Goals / ...)         │
│ 2. spec   — 详细规格说明(Requirements + Scenarios)      │
│                                                         │
│ 0. 流程终结(不再选择更多 artifacts)                      │
└─────────────────────────────────────────────────────────┘
用户选择: 1

第 3 轮:列出依赖 design 的 artifacts(且所有 parent 都已选)
┌─────────────────────────────────────────────────────────┐
│ 依赖 design 的 artifacts:                               │
│                                                         │
│ 1. spec   — 详细规格说明(Requirements + Scenarios)      │
│                                                         │
│ 0. 流程终结(不再选择更多 artifacts)                      │
└─────────────────────────────────────────────────────────┘
用户选择: 0 (流程终结)

最终选择: [proposal, design]
```

**规则**:

- 每轮只列出**所有 parent 都已选中**的 artifacts
- `requires` 是列表,一个 artifact 可以挂在多个 parent 上
- 每轮都有 `0. 流程终结` 选项
- 用户选 `0` 或没有更多可选 artifacts 时,选择阶段结束

**requires 解析**:

- 从 `omo-spec/artifacts/<name>/instruction.md` 头部解析 `requires: [...]` 格式
- 如果没有 requires 字段,视为 root 节点(requires = [])

### Step 3: 校验 spec 目录是否已存在

```bash
ls -la spec/<change-name>/ 2>/dev/null
```

- 存在 → 停下问用户:`spec/<change-name>/ 目录已存在。覆盖 / 备份后覆盖 / 中止?`(用 `question` 工具)
- 不存在 → 继续

### Step 4: 调脚本生成 spec 目录和 source plan

```bash
bun run omo-spec/skills/omo-spec/scripts/gen-source-plan.ts <change-name> --artifacts <list>
```

**参数说明**:

- `<change-name>`: change 名
- `--artifacts <list>`: 逗号分隔的 artifact 名(用户在 Step 2 选择的,按依赖顺序)
- `--lang <zh|en|auto>`: 可选,语言处理(默认 auto=删除占位符)

**脚本输出**:

- `spec/<change-name>/` 目录(创建 + 复制 template.md 文件)
- `spec-source-<change-name>.md` plan 文件(OMO 9 章节格式,无编号,模仿真实 OMO plan 风格如 `.omo/plans/schema-capabilities.md`)
- 控制台:成功消息 + Artifacts/Language 摘要 + 下一步提示

**plan 文件结构**(脚本生成):

```markdown
## TL;DR

<TODO: 1-3 句话概述本次变更...>

## Context

<TODO: 2-5 句话说明背景...>

## Work Objectives

<TODO: 范围边界...>
**Must Have**:

- **proposal**: <TODO: 此 artifact 的目标>
- **design**: <TODO: 此 artifact 的目标>
  ...

## Verification Strategy

<TODO: 验证手段...>
每个 spec requirement 有对应的 scenario 作为验收标准:

- <TODO: 验证 proposal 的内容质量>
  ...

## Execution Strategy

<TODO: 关键路径 / 并发约束...>
核心设计决策来自 design.md:

- <TODO: Decision 1>
  ...
  **Critical Path**: proposal → design → spec
  **Max Concurrent**: 1

## Tasks

### 6.1 Wave 1: proposal

#### 1. [ ] 生成 proposal

- **What to do**: ...
- **Must NOT do**: ...
- **References**: instruction/template/output paths
- **Acceptance Criteria**: ...
- **QA Scenarios**: Happy/Exception/Edge/Performance/Security
- **Commit**: YES
  ...

## Final Verification Wave

- [ ] F1. **proposal 验证** — <TODO: 验证内容质量>
- [ ] F2. **design 验证** — ...
- [ ] F3. **omo-spec 工作流验证** — ...

## Commit Strategy

<TODO: commit 策略...>

- <TODO: Wave 1 (proposal) 的 commit message>

## Success Criteria

<TODO: 成功标准...>

- [ ] `spec/<change-name>/proposal.md` 生成且通过结构验证(F1)
      ...
```

**失败处理**:脚本 exit code != 0 → 立即停止,显示错误信息,等用户介入

### Step 5: 读取生成的 spec 目录和 source plan

**只读**,不要修改:

```bash
ls spec/<change-name>/
cat spec-source-<change-name>.md
```

(或者用 Read 工具)

**目的**:让 LLM 看到 spec 目录中的模板文件,以及 plan 中已生成的 `<TODO: ...>` 占位符。

### Step 6: LLM 替换 TODO 占位符(本 skill 的核心)

**规则**:

1. **只替换 `<TODO: ...>` 占位符**:
   - `## TL;DR` 下的 `<TODO: 1-3 句话概述本次变更...>` → 实际 1-3 句话
   - `## Context` 下的 `<TODO: ...>` → 实际 2-5 句话背景
   - `## Work Objectives` 下的 `<TODO: ...>` → 实际 Must Have / Must NOT Have
   - `## Verification Strategy` 下的 `<TODO: ...>` → 实际验证手段
   - `## Execution Strategy` 下的 `<TODO: ...>` → 实际关键路径/并发约束/风险
   - `## Final Verification Wave` 下的 `<TODO: 验证项标题>` / `<TODO: 验证 ...>` → 实际 F{N} 验证项
   - `## Commit Strategy` 下的 `<TODO: ...>` → 实际 commit message
   - `## Success Criteria` 下的 `<TODO: ...>` → 实际成功标准

2. **绝不修改**:
   - `## Tasks` 章节(脚本生成的 Wave 块,包含 instruction 引用)
   - 章节标题(脚本生成,固定格式)
   - spec 目录中的模板文件(由脚本复制,LLM 不动)
   - 任何 `{{...}}` 占位符(脚本会报错)

3. **替换方式**:
   - 看到 `<TODO: 描述>` → 用对应的 markdown 内容替换
   - 看到 `<TODO: 验证项标题>` → 用实际验证项标题替换
   - 看到 `<TODO: 此 artifact 的目标>` → 用具体目标替换

4. **填充内容来源**:
   - 当前对话上下文(用户需求描述、约束、已确认的点)
   - LLM 内部推理(不调外部工具——`gen-source-plan.ts` 已把所有需要的 instruction 内容嵌入了,LLM 不需要再 fetch 任何东西)
   - **不要**调 `openspec instructions` / `openspec status`(本 skill 完全靠脚本嵌入的静态内容)

### Step 7: 写入填充后的 source plan

**直接覆盖** `spec-source-<change-name>.md`(用 Read → Edit 工具,只替换 `<TODO: ...>` 部分,不要重写整个文件)

或者用 Write 工具整体重写(脚本的 `{{...}}` 占位符已被替换,不会冲突)。

### Step 8: 输出报告 + STOP

报告内容:

- `✅ Spec 目录已创建: spec/<change-name>/`
- `✅ Source plan 已生成: spec-source-<change-name>.md`
- `   Artifacts: <选中的 artifact 列表>`
- `   Language: <lang>`
- 列出 spec 目录中的模板文件
- 列出已替换 TODO 的章节
- 列出**未**替换的章节(6 Tasks — 脚本生成,LLM 不动)

**STOP 提示**:

```
📝 接下来:
  1. 用户 review spec/<change-name>/ 目录中的模板文件
  2. 用户 review spec-source-<change-name>.md
  3. 确认无误后,跑 /start-work spec-source-<change-name> 实施
  4. /start-work 会按 ## Tasks 的 Wave 顺序逐个执行,每个 Wave 完成后停下问是否继续
```

---

## Guardrails

- **不修改任何老文件**:`.opencode/skills/openspec-*`、`schemas/`、`skills/omo-apply-change/`、`openspec/config.yaml` 一律不动
- **不调 OpenSpec 动态 fetch**:不调 `openspec instructions` / `openspec status`(本 skill 完全靠脚本嵌入的静态内容)
- **不写 OpenSpec artifacts 文件**:本 skill 只生成 source plan + spec 目录,artifacts 文件由 `/start-work` 阶段生成
- **不调 `/omo-apply-change`**:apply 阶段由用户在 source plan 全部跑完后手动触发
- **Fast Fail**:任何 `task()` / `tool()` / `skill()` 调用失败 → 立即停止,不得降级/重试/跳过/自行替代执行
- **占位符保护**:LLM 替换阶段不能写 `{{XXX}}` 格式字符串(脚本会检测到残留并抛错)
- **TODO 占位符清理**:LLM 替换后 plan 中不应残留 `<TODO: ...>` 标记(残留意味着未完成)

---

## 失败处理(Fast Fail)

任何步骤失败(脚本 exit code != 0 / LLM 理解错误 / 用户中断 / 文件权限):

1. 立即停止工作流
2. 报告 `🔴 [步骤名] 中断:[错误信息]`
3. 等待用户介入

**禁止**:重试 / 降级 / 跳过 / 自行替代执行
