# omo-spec Design Document

**版本**:1.0
**日期**:2026-06-11
**作者**:omo-spec 设计会话(用户 + Sisyphus 协作)

本文档存档 omo-spec 体系的完整设计决策、选型理由、风险点与未来扩展方向。

## 1. 背景与动机

### 1.1 现状(1.0 流程)

OpenSpec 1.0 工作流由 11 个 skill 驱动(`.opencode/skills/openspec-*`),核心模式是:

```
用户 → /openspec-new-change → SKILL.md 让 AI 跑 openspec CLI
     → CLI 返回 JSON {context, rules, template, instruction, ...}
     → AI 从 JSON 里读 instruction 字段执行
     → 循环 3 次(proposal → design → specs)
     → /omo-apply-change → inspect-apply.ts 又 fetch 一次
     → /start-work 实施
```

每个 artifact 的"真正指令"(`openspec instructions <id>` 返回的 `instruction` 字段)是动态获取的,藏在 CLI 返回的 JSON 里。

### 1.2 痛点

| 痛点                   | 表现                                                                                                                                                | 影响                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **指令多跳丢失**       | SKILL.md 顶层指令 ≠ CLI 返回的 nested `instruction`,LLM 注意力分配时被竞争                                                                          | 指令遵守不严格,artifact 质量不稳定           |
| **模板/指令混淆**      | `instruction` 是行为约束,`template` 是文件骨架,`context`/`rules` 是不写入文件的隐藏约束——4 个字段含义不同,LLM 经常把 `context`/`rules` 误写到文件里 | artifact 格式错误,`openspec validate` 失败   |
| **Token + 时间双浪费** | 每次 artifact 都要 fetch 一次,每个 fetch 输出 2-5KB JSON,中间还要 stop & review                                                                     | 一份 4-artifact change 跑下来多 30-50% token |

### 1.3 关键洞察

`openspec instructions` 返回的 `instruction` 字段虽然是**运行时动态获取的**,但其内容是**确定性的**(从 `schemas/<schema>/schema.yaml` 静态读取)。这意味着我们可以在**生成阶段**就把这些内容嵌入到 plan 中,而不是在**执行阶段**让 LLM 临时 fetch。

## 2. 设计目标

| 目标                            | 衡量标准                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| **G1: 消除动态 fetch**          | LLM 跑 source plan 时不调 `openspec instructions` / `openspec status` |
| **G2: 注意力集中**              | LLM 在一个文件里看到所有 instruction(无嵌套 JSON 解析)                |
| **G3: 1.0 完全不动**            | 仓库老文件 git diff 为 0                                              |
| **G4: OpenSpec 产物 100% 兼容** | `openspec validate` / `status` / `archive` 都能跑                     |
| **G5: 复用 OMO 基础设施**       | 不重写 plan 机制,只用 `/start-work`                                   |
| **G6: 复用 1.0 apply 阶段**     | `/omo-apply-change` 不改                                              |

## 3. 核心设计决策

### 3.1 决策一:omo-spec 独立目录,老 skill 完全不动

**问题**:omo-spec 流程怎么放?改造老 skill?新增并列 skill?覆盖老 skill?

**选定**:**新增独立目录 `omo-spec/`**,与 1.0 平行存在。老的 11 个 skill 1 行都不改。

**理由**:

- 零迁移成本:老用户无感
- 切换双向:用户可选择 原流程或 omo-spec
- 风险隔离:omo-spec bug 不影响 1.0
- 仓库干净:`git status` 老文件 0 diff

**否决方案**:

- ~~改造 `/openspec-ff-change`~~ — 改变老 skill 行为,破坏 1.0 用户
- ~~删除 1.0 skills~~ — 无向后兼容
- ~~作为 1.0 的可选模式(flag)~~ — 增加老 skill 复杂度

### 3.2 决策二:Source plan = OMO 9 章节 + 静态嵌入

**问题**:把 instruction 静态嵌入到哪个载体?

**选定**:**OMO 9 章节 plan**(`## TL;DR` ~ `## Success Criteria`)

**理由**:

- OMO 已有的成熟 plan 机制
- 不需要新的执行引擎
- 与 apply 阶段的 compile plan 同构(便于 `/start-work` 统一处理)
- `## TODOs` 天然支持 Wave 分波 + task 描述
- `## Final Verification Wave` 天然支持 review checkpoint

**第 7/8 章静态嵌入策略**:

- 第 7 章嵌入 `schema.yaml` 的 `instruction` 全文(行为约束)
- 第 8 章嵌入 `templates/` 的文件全文(结构骨架)
- 第 6 章每个 task 显式 `Embedded Reference: 第 7.N 节 + 第 8.N 节`(强制 LLM 读)

**第 6/7/8 章的"分散"是有意为之**:

- 不挤在 1 个章节(避免 200KB 单文件,LLM 注意力丢失)
- 但每个 task 都显式引用 7/8(避免 LLM 跳过 7/8)

### 3.3 决策三:脚本生成骨架 + LLM 填充业务内容

**问题**:source plan 怎么生成?LLM 全程主导?脚本全自动?中间方案?

**选定**:**脚本自动生成 6/7/8 章(确定性内容),LLM 填充 1-5/9 章(业务内容)**

**理由**:

- 第 7/8 章是 schema 决定的,LLM 没有判断空间,完全脚本化更稳定
- 第 1-5/9 章需要理解对话上下文,只有 LLM 能填
- 脚本生成的章节格式严格一致(便于 Oracle 自动化检查)
- LLM 只需要关注业务内容,认知负担小

**脚本职责**(`gen-source-plan.ts`):

- 读 `schemas/<schema>/schema.yaml` 解析 artifacts
- 读 `schemas/<schema>/templates/*` 拿到每个 artifact 的 markdown
- 读 `omo-spec/templates/source-plan-<schema>.md` 骨架
- 处理 `__LANG_PLACEHOLDER__` 替换
- 生成 6/7/8 章内容
- 写入 `.omo/plans/source-<change-name>.md`

**LLM 职责**(`/omo-spec-source-plan` skill 触发):

- 读 source plan 骨架
- 基于对话上下文填 1-5/9 章
- 写回 `.omo/plans/source-<change-name>.md`
- **不**调 OpenSpec CLI(omo-spec 的核心原则)

### 3.4 决策四:每个 Wave 后停下 review

**问题**:source plan 执行时,中间要不要让用户 review?

**选定**:**每个 Wave 完成后停下,用 `question` 工具问用户是否继续**

**理由**:

- 保留 1.0 的 review 机会(每个 artifact 后用户可调整)
- 跳过 1.0 的 stop + 新 turn 开销(LLM 在同一次 `/start-work` 内走完)
- 平衡 review 完整性和效率

**否决方案**:

- ~~全跑完再 review~~ — 失去中间调整机会,出错时回退成本大
- ~~只有关键节点停(proposal + design)~~ — specs 是关键产物,跳过 review 风险高

### 3.5 决策五:Apply 阶段复用 1.0

**问题**:omo-spec 要不要自己实现 apply 阶段?

**选定**:**复用 1.0 的 `/omo-apply-change`**,不重写

**理由**:

- 1.0 的 apply 阶段已经成熟(inspect-apply.ts)
- compile plan 格式和 1.0 的 OMO plan 完全一致
- `inspect-apply.ts` 不需要改——它只是检查 `.omo/plans/<name>.md` 是否存在
- 重写 apply 阶段 = 重造轮子 + 引入新 bug

**验证**:`.omo/plans/<change-name>.md`(compile plan)格式与 1.0 的 OMO plan 9 章节完全一致,`inspect-apply.ts` 100% 兼容。

### 3.6 决策六:唯一入口 `/omo-spec-source-plan`

**问题**:omo-spec 要几个 skill 入口?

**选定**:**只 1 个入口**:`/omo-spec-source-plan`

**理由**:

- 职责单一:只生成 source plan
- 减少入口维护成本
- 入口多 = 文档多 = 用户困惑多
- 其他阶段(source plan 执行 / apply / archive)全部复用 1.0

**否决方案**:

- ~~4 个入口(source-plan / apply / verify / archive)~~ — apply 复用 1.0,其他 2 个没特殊逻辑

### 3.7 决策七:`OPENSPEC_LANG` 环境变量(对齐老 sync.sh)

**问题**:`__LANG_PLACEHOLDER__` 怎么处理?用户怎么控制语言?

**选定**:`OPENSPEC_LANG` 环境变量(对齐老 `scripts/sync.sh` 的 `--lang` 行为)

**逻辑**:

- `zh` → 替换为 "**语言**: 所有生成的文档必须使用中文。"
- `en` → 替换为 "**Language**: All generated documents MUST be written in English."
- `auto`(默认)→ 删除占位符所在行

**理由**:

- 与老 sync.sh 行为一致(降低学习成本)
- 通过环境变量控制,不需要命令行参数(简化 skill 调用)
- 默认 `auto` 删除占位符(适合不需要语言提示的场景)

## 4. 架构

### 4.1 模块依赖

```
┌─────────────────────────────────────────────────────────────────┐
│                        omo-spec 架构                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  /omo-spec-source-plan (SKILL.md)                              │
│       │                                                         │
│       │ 调(只读)                                                │
│       ▼                                                         │
│  gen-source-plan.ts (Bun 脚本)                                 │
│       │                                                         │
│       │ 读(只读)                                                │
│       ├─► schemas/<schema>/schema.yaml ◄────── 老文件(不动)     │
│       ├─► schemas/<schema>/templates/*  ◄────── 老文件(不动)     │
│       └─► omo-spec/templates/source-plan-<schema>.md           │
│                                                                 │
│       │ 写                                                      │
│       ▼                                                         │
│  .omo/plans/source-<change-name>.md                            │
│       │                                                         │
│       │ 用户 review 后                                          │
│       ▼                                                         │
│  /start-work source-<change-name> (OMO 内置)                   │
│       │                                                         │
│       │ 执行 source plan,产出:                                  │
│       ├─► openspec/changes/<name>/{proposal,design,specs}.md │
│       └─► .omo/plans/<name>.md (compile plan)                  │
│                                                                 │
│       │ 用户跑                                                  │
│       ▼                                                         │
│  /omo-apply-change <name> (1.0 复用)                          │
│       │                                                         │
│       │ inspect-apply.ts 读 compile plan                       │
│       ▼                                                         │
│  /start-work <name> (OMO 内置,实施 compile plan)              │
│       │                                                         │
│       │ Oracle 验证 ≤ 3 轮                                     │
│       │                     │
│       ▼                                                         │
│  /openspec-archive-change <name> (1.0 复用)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 数据流

```
对话上下文
    │
    │ (用户调用)
    ▼
/omo-spec-source-plan <name>
    │
    │ (脚本读取老 schema/template)
    ▼
.omo/plans/source-<name>.md
    ├─ 第 1-5/9 章: LLM 填业务内容
    ├─ 第 6 章: 脚本生成 Wave 块
    ├─ 第 7 章: 脚本嵌入 instruction
    └─ 第 8 章: 脚本嵌入 template
    │
    │ (用户跑 /start-work)
    ▼
openspec/changes/<name>/
    ├─ proposal.md   (Wave 1)
    ├─ design.md     (Wave 2)
    ├─ specs/*.md    (Wave 3,可能多个)
    └─ 
    │
    │ (Wave 4 同步生成)
    ▼
.omo/plans/<name>.md (compile plan)
    │
    │ (用户跑 /omo-apply-change)
    ▼
/start-work <name> (实施 compile plan)
    │
    │ Oracle 验证
    │ 
    ▼
代码改动
```

## 5. 关键文件清单

| 文件                                                                             | 行数     | 职责                                  |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| `omo-spec/templates/source-plan-spec-driven.md`                                  | ~140     | 4-artifact schema 的 source plan 骨架 |
| `omo-spec/templates/source-plan-constitution.md`                                 | ~130     | 2-artifact schema 的 source plan 骨架 |
| `omo-spec/skills/omo-spec-source-plan/scripts/gen-source-plan.ts`                | ~330     | 读老 schema+template,生成 source plan |
| `omo-spec/skills/omo-spec-source-plan/scripts/__tests__/gen-source-plan.test.ts` | ~430     | 36 个单元测试                         |
| `omo-spec/skills/omo-spec-source-plan/SKILL.md`                                  | ~180     | 入口 skill 指令                       |
| `omo-spec/README.md`                                                             | ~200     | 体系介绍                              |
| `omo-spec/DESIGN.md`                                                             | (本文件) | 设计决策存档                          |

**总计 ~1410 行**(脚本 + 测试占 ~50%,文档占 ~50%)

## 6. 风险与缓解

### 6.1 Source plan 体积膨胀

**风险**:静态嵌入所有 instruction + template 后,source plan 体积大(spec-driven 估计 30-50KB,constitution 估计 10-15KB)。LLM 处理大文件时注意力可能下降。

**缓解**:

- 第 7 章用 `<details>` 折叠(LLM 知道去展开)
- 第 6/7/8 章节标题明确,LLM 可按需读
- 测试:在示例 `add-user-auth` 跑通后,统计实际 token 消耗,确认 < 1.0

**当前状态**:已用 `<details>` 折叠 instruction(测试覆盖)

### 6.2 schema 同步问题

**风险**:老 `schemas/<schema>/schema.yaml` 修改后,已生成的 source plan 不会自动更新——LLM 执行时用的是旧 instruction。

**缓解**:

- 文档明确:schema 改动后必须重新跑 `gen-source-plan.ts` 生成 source plan
- 检查点:`/start-work` 跑 source plan 时,先比对 source plan 头部 `generatedAt` 和 schema.yaml mtime,不一致时警告
- 未来增强:可加 `omo-spec-source-plan --check-schema` 子命令做一致性检查

**当前状态**:仅在 README/DESIGN 文档说明,未在脚本强制

### 6.3 LLM 不读第 7/8 章

**风险**:即使 instruction 静态嵌入,LLM 可能跳过 7/8 章,只读 6 章 task 描述(无 instruction 等同于瞎做)。

**缓解**:

- 第 6 章 task 显式 `Embedded Reference: 第 7.N 节 + 第 8.N 节`(强制引用)
- 任务 `What to do` 第 2 步明确说"按第 7.N 节嵌入的 instruction 行为约束执行"
- 任务 `Forbidden` 字段列出常见错误(写入 `<context>` 等)
- 测试:手跑 add-user-auth 示例,验证 LLM 是否真的读了 7/8

**当前状态**:设计已包含所有缓解,效果待示例验证

### 6.4 与 1.0 命名冲突

**风险**:`.omo/plans/<name>.md` 是 1.0 的 compile plan 位置,omo-spec 也写同一目录(`source-<name>.md`)。`inspect-apply.ts` 找的是 `<name>.md`(compile plan),不会和 `source-<name>.md` 冲突——但要确保命名不重叠。

**缓解**:

- 明确命名约定:`source-<name>.md`(source plan)vs `<name>.md`(compile plan)
- `gen-source-plan.ts` 输出路径固定 `source-<name>.md`,绝不写 `<name>.md`
- `inspect-apply.ts` 不感知 source plan,只找 compile plan

**当前状态**:命名约定已明确,代码已固定

## 7. 测试策略

### 7.1 单元测试(已完成)

`gen-source-plan.test.ts` 覆盖 8 大类、36 个测试:

1. **parseSchema** — 5 测试(真实 spec-driven / constitution 解析 / 缺失字段 / 空字符串 / 空 artifacts)
2. **replaceLanguage** — 7 测试(zh / en / auto / 多次出现 / 无占位符 / CRLF 行尾)
3. **generateTargetArtifactsYaml** — 3 测试(单 / 多 / 空)
4. **generateWavesBlock** — 7 测试(4 artifacts / 2 artifacts / task 格式 / Embedded Reference / specs 特殊处理 / Review Checkpoint / Agent Profile)
5. **generateSchemasBlock** — 6 测试(章节结构 / code fence / language / 折叠)
6. **generateTemplatesBlock** — 4 测试(章节结构 / 全文嵌入 / 缺失占位)
7. **generateSourcePlan**(集成)— 3 测试(占位符替换 / 残留检测 / DATE 格式)
8. **readDefaultSchema** — 1 测试(config 不存在)

**运行**:`bun test omo-spec/skills/omo-spec-source-plan/scripts/__tests__/gen-source-plan.test.ts`

**当前结果**:**36 pass, 0 fail, 76 expect() calls**

### 7.2 端到端测试(待完成)

`omo-spec/examples/add-user-auth/` 示例:

1. 手动跑 `openspec new change add-user-auth` 创建 change
2. 跑 `gen-source-plan.ts add-user-auth` 生成 source plan
3. LLM 填 1-5/9 章(本次手动模拟,实际由 `/omo-spec-source-plan` skill 完成)
4. 跑 `/start-work source-add-user-auth` 实施,产出 4 个 artifacts + compile plan
5. 跑 `/omo-apply-change add-user-auth` 进入 apply 阶段
6. 验证产物与 1.0 完全一致(`diff` 比较)

## 8. 未来扩展

### 8.1 新增 schema 适配

新增 schema(如 `tdd-driven` / `lean-validation`)只需:

1. 在 `schemas/<new-schema>/` 下创建 `schema.yaml` + `templates/`
2. 在 `omo-spec/templates/` 下加 `source-plan-<new-schema>.md`(参考现有 2 个)
3. 在 `gen-source-plan.ts` 的 `readDefaultSchema` 默认值中加注释
4. 跑 36 个现有测试(全过)+ 加新 schema 的 fixture 测试

**无需**改 `gen-source-plan.ts` 的核心逻辑(它从 schema.yaml 动态读取 artifacts)。

### 8.2 `--check-schema` 一致性检查

CLI 加 `--check-schema` 模式:比对 source plan 头部的 `generatedAt` 和 `schema.yaml` 的 mtime,不一致时警告或拒绝执行。

### 8.3 Momus 自动审查 source plan

在 source plan 写完后、`/start-work` 之前,加 1 个 Momus agent 审查:

- 9 章节结构是否完整
- 第 6 章 Wave 数 == artifacts 数
- 第 7/8 章嵌入是否完整
- LLM 填充的 1-5/9 章是否覆盖了模板要求

**当前状态**:未实现,属于后续增强

### 8.4 完整 omo-spec 子包(apply / verify / archive)

如果未来 1.0 的 `/omo-apply-change` 需要调整(比如支持增量 apply / 智能重试),可以在 `omo-spec/skills/` 下加:

- `omo-spec-apply/`
- `omo-spec-verify/`
- `omo-spec-archive/`

**当前状态**:**不做**——3.5 决策明确复用 1.0。

## 9. 实施时间线

| 步骤 | 文件                                                                             | 状态       |
| ---- | -------------------------------------------------------------------------------- | ---------- |
| 1    | `omo-spec/templates/source-plan-spec-driven.md`                                  | ✅ done    |
| 2    | `omo-spec/templates/source-plan-constitution.md`                                 | ✅ done    |
| 3    | `omo-spec/skills/omo-spec-source-plan/scripts/gen-source-plan.ts`                | ✅ done    |
| 4    | `omo-spec/skills/omo-spec-source-plan/scripts/__tests__/gen-source-plan.test.ts` | ✅ done    |
| 5    | `omo-spec/skills/omo-spec-source-plan/SKILL.md`                                  | ✅ done    |
| 6    | `omo-spec/README.md` + `omo-spec/DESIGN.md`                                      | ✅ done    |
| 7    | `omo-spec/examples/add-user-auth/` 端到端                                        | ⏳ pending |
| 8    | momus 审查 + 用户最终 review                                                     | ⏳ pending |

## 10. 选型理由汇总(给 momus 审查参考)

| 选型                           | 备选                                 | 选定理由                                                   |
| ------------------------------ | ------------------------------------ | ---------------------------------------------------------- |
| Bun 内置 YAML.parse            | js-yaml 包                           | 0 依赖,`import.meta.main` 与项目其他脚本一致               |
| Source plan = OMO 9 章节       | 新建 plan 格式                       | 复用 OMO 成熟机制,apply 阶段零改动                         |
| 静态嵌入 instruction           | partial fetch(按需拉取)              | 1.0 痛点正是 partial fetch 注意力分散,新方案必须彻底消除   |
| 脚本生成骨架 + LLM 填          | LLM 全程主导 / 脚本全生成            | 业务内容只有 LLM 知道;确定性内容脚本生成更稳               |
| 命名 `source-<name>.md`        | 子目录 `.omo/plans/<name>/source.md` | 扁平,易于 inspect-apply.ts 不感知                          |
| `/omo-spec-source-plan` 单入口 | 多入口                               | 降低维护成本,1.0 的 11 个入口教训                          |
| 复用 1.0 apply 阶段            | 自实现 apply                         | 1.0 已成熟,inspect-apply.ts 0 改动 |
| `OPENSPEC_LANG` 环境变量       | 命令行 `--lang`                      | 与老 sync.sh 行为一致,降低学习成本                         |
| 每个 Wave 后停下 review        | 全跑完再 review                      | 保留 1.0 review 机会,跳过 stop-turn 开销                   |

---

**未来变更**:任何重大调整请同步更新本文件,保持设计与实现一致。
