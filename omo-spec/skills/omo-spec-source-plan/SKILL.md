---
name: omo-spec-source-plan
description: omo-spec 入口。读老 schema.yaml + templates 静态生成 source plan(把每个 artifact 的 instruction/template 嵌入 plan 章节),LLM 填业务内容后跑 /start-work 执行。Require: openspec CLI + OMO plugin + bun runtime.
metadata:
  author: omo-spec
  version: "1.0"
  generatedBy: "omo-spec 1.0"
---

# omo-spec Source Plan Generator

**职责单一**:为指定 OpenSpec change 生成 omo-spec 风格的 source plan,让 LLM 一次性写完全部 artifacts + compile plan。

**调用**:`/omo-spec-source-plan <change-name> [--schema <name>]`

**输入**:change 名(kebab-case)。可选 `--schema` 指定 schema 名,默认从 `openspec/config.yaml` 读 `defaultSchema`。

**输出**:`.omo/plans/source-<change-name>.md`(含 9 章节 OMO plan 结构,第 7/8 章已静态嵌入老 schema.yaml instruction 和 templates)

---

## Steps(严格按顺序执行,每步失败立即停止)

### Step 1: 解析输入

从用户输入提取:

- `changeName`(必填,kebab-case)
- `schemaName`(可选,默认从 `openspec/config.yaml` 读 `defaultSchema`)

**校验**:

- change 名必须是 kebab-case(小写字母+数字+连字符)
- 若用户给的格式不规范(如 `Add User Auth` / `addUserAuth`),用 `/(?=[A-Z])| /` 拆分转 kebab-case 后告知用户

### Step 2: 校验 change 是否已存在(可选快速失败)

**目的**:避免覆盖已有 source plan 导致信息丢失。

```bash
ls -la .omo/plans/source-<change-name>.md 2>/dev/null
```

- 存在 → 停下问用户:`source-<change-name>.md 已存在。覆盖 / 备份后覆盖 / 中止?`(用 `question` 工具)
- 不存在 → 继续

### Step 3: 校验 OpenSpec change 目录是否存在(只读校验)

```bash
ls -la openspec/changes/<change-name>/ 2>/dev/null
```

- 不存在 → 提示用户先跑 `openspec new change <change-name>` 创建,本 skill **不会自动创建**(避免与 1.0 流程产生副作用)
- 存在 → 继续

### Step 4: 调脚本生成 source plan 骨架

```bash
@scripts/gen-source-plan.ts <change-name> [--schema <name>] [--lang <zh|en|auto>]
```

**Lang 默认值**:

- 优先用 `--lang` 参数
- 其次用 `OPENSPEC_LANG` 环境变量
- 最后默认 `auto`(删除 `__LANG_PLACEHOLDER__` 所在行)

**脚本输出**:

- `.omo/plans/source-<change-name>.md`(写入)
- 控制台:成功消息 + Schema/Artifacts/Language 摘要 + 下一步提示

**失败处理**:脚本 exit code != 0 → 立即停止,显示错误信息,等用户介入(不得自行修复 schema.yaml 或 templates)

### Step 5: 读取生成的 source plan

**只读**,不要修改:

```bash
cat .omo/plans/source-<change-name>.md
```

(或者用 Read 工具)

**目的**:让 LLM 看到第 7/8 章已嵌入的内容,以及第 1-5/9 章的占位符,理解整个 source plan 的结构。

### Step 6: LLM 填充业务内容(本 skill 的核心)

**规则**:

1. **只填充 5 个章节的业务内容**:
   - 第 1 章 `## 1. TL;DR`
   - 第 2 章 `## 2. Context`
   - 第 3 章 `## 3. Work Objectives`
   - 第 4 章 `## 4. Verification Strategy`
   - 第 5 章 `## 5. Execution Strategy`
   - 第 9 章 `## 9. Compile Plan Generation`(部分填,9.1/9.3/9.4 是模板写死的,9.2 是 LLM 填的)

2. **绝不修改**:
   - frontmatter(yaml 部分)
   - 第 6 章 `## 6. TODOs`(脚本生成的 Wave 块)
   - 第 7 章 `## 7. Static Schemas`(脚本嵌入的 instruction)
   - 第 8 章 `## 8. Static Templates`(脚本嵌入的 template)
   - 任何 `{{...}}` 占位符(脚本会报错)

3. **填充方式**:
   - 看到 `<!-- LLM_FILL: 描述 -->` 标记 → 用 markdown 内容替换整行注释
   - 看到 `<!-- TODO_NN: 描述 -->` 标记 → 视为业务内容占位符,逐个替换
   - 看到 `_(待 LLM 填充)_` 标记 → 同上
   - 看到模板写死的部分(如第 9.1 翻译映射表) → 保留原样,只填可变的描述

4. **填充内容来源**:
   - 当前对话上下文(用户需求描述、约束、已确认的点)
   - LLM 内部推理(不调外部工具——`gen-source-plan.ts` 已把所有需要的 schema/template 内容嵌入了,LLM 不需要再 fetch 任何东西)
   - **不要**调 `openspec instructions` / `openspec status`(2.0 的核心是消除动态 fetch,本 skill 必须以身作则)

### Step 7: 写入填充后的 source plan

**直接覆盖** `.omo/plans/source-<change-name>.md`(用 Read → Edit 工具,只改 1-5/9 章,不要重写整个文件)

或者用 Write 工具整体重写(脚本的占位符已被替换,不会冲突)。

### Step 8: 输出报告 + STOP

报告内容:

- `✅ Source plan 已生成: <绝对路径>`
- `   Schema: <schemaName>`
- `   Artifacts: <artifact.id 列表>`
- `   Language: <lang>`
- 列出已填充的章节(1-5/9)
- 列出**未**填充的章节(6/7/8——脚本生成,LLM 不动)

**STOP 提示**:

```
📝 接下来:
  1. 用户 review .omo/plans/source-<change-name>.md
  2. 确认无误后,跑 /start-work source-<change-name> 实施
  3. /start-work 会按 ## TODOs 的 Wave 顺序逐个执行,每个 Wave 完成后停下问是否继续
  4. 全部 Wave 完成后,跑 /omo-apply-change <change-name> 进入 apply 阶段(由 1.0 skill 处理)
```

---

## Guardrails

- **不修改任何老文件**:`.opencode/skills/openspec-*`、`schemas/`、`skills/omo-apply-change/`、`openspec/config.yaml` 一律不动
- **不调 OpenSpec 动态 fetch**:不调 `openspec instructions` / `openspec status`(本 skill 完全靠脚本嵌入的静态内容)
- **不写 OpenSpec artifacts 文件**:本 skill 只生成 source plan,4 个 artifact 文件由 `/start-work` 阶段生成
- **不写 compile plan**:compile plan 由 `/start-work` 阶段的最后 1 个 Wave 生成
- **不调 `/omo-apply-change`**:apply 阶段由用户在 source plan 全部跑完后手动触发
- **Fast Fail**:任何 `task()` / `tool()` / `skill()` 调用失败 → 立即停止,不得降级/重试/跳过/自行替代执行
- **占位符保护**:LLM 填充阶段不能写 `{{XXX}}` 格式字符串(脚本会检测到残留并抛错)

---

## 与 1.0 流程的对照

| 1.0 流程                                                              | omo-spec 2.0 流程                                        |
| --------------------------------------------------------------------- | -------------------------------------------------------- |
| `/openspec-new-change` → 多次 `/openspec-continue-change` × N         | 单次 `/omo-spec-source-plan` 生成 source plan            |
| 每个 artifact 都要 fetch 一次 `openspec instructions`                 | source plan 静态嵌入所有 instruction,无 fetch            |
| LLM 注意力在 `SKILL.md` ↔ `CLI 返回 JSON` ↔ `instruction 字段` 间分散 | LLM 一次读完 source plan,instruction 在第 7/8 章显式可见 |
| Apply 阶段:再次 fetch `openspec instructions apply`                   | Apply 阶段:plan 已存在,`/start-work` 直接读 plan         |
| Token 成本:每 artifact 2-5KB fetch × 4 + apply fetch                  | Token 成本:0 fetch(全部静态嵌入)                         |

---

## 失败处理(Fast Fail)

任何步骤失败(脚本 exit code != 0 / LLM 理解错误 / 用户中断 / 文件权限):

1. 立即停止工作流
2. 报告 `🔴 [步骤名] 中断:[错误信息]`
3. 等待用户介入

**禁止**:重试 / 降级 / 跳过 / 自行替代执行

---

## 输出格式参考(成功时)

```
✅ omo-spec Source plan 已生成: /Users/.../omo-spec/examples/add-user-auth/.omo/plans/source-add-user-auth.md
   Schema: spec-driven
   Artifacts: proposal, design, specs, tasks
   Language: auto

📝 业务内容已填充章节:
   - 第 1 章 TL;DR:为 <project> 添加用户认证能力,支持 OAuth2 + Email/Password 两种登录方式
   - 第 2 章 Context:当前项目无认证模块,需要从零搭建
   - 第 3 章 Work Objectives: Must Have: OAuth2 + Email/Password / Must NOT Have: 不引入第三方身份提供商
   - 第 4 章 Verification Strategy: openspec validate + 单元测试 + 集成测试
   - 第 5 章 Execution Strategy: 严格按 proposal → design → specs → tasks → compile-plan 顺序,Max Concurrent: 1
   - 第 9 章 Compile Plan Generation: 9.1 翻译映射表保留,9.2 写入位置 + 9.3 验证清单已确认

📋 脚本生成章节(LLM 不动):
   - 第 6 章 TODOs: 4 个 Wave 块(proposal / design / specs / tasks)
   - 第 7 章 Static Schemas: 4 个 artifact instruction 全文(语言已处理)
   - 第 8 章 Static Templates: 4 个 template 文件全文

⏸️ 等待用户 review。

下一步:
  1. 用户 review .omo/plans/source-add-user-auth.md
  2. 跑 /start-work source-add-user-auth 实施
```
