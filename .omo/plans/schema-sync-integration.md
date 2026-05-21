# schema.yaml 改动：plan 聚合生成 + 任务状态同步

## TL;DR

> **核心目标**：解决两个问题：
> 1. **生成问题**— schema 的 tasks 阶段必须生成兼容 OMO 的 plan 文件，该 plan 不是 tasks.md 的副本，而是 4 个 artifact 的*
     *聚合产物**
> 2. **同步问题**— apply 阶段 checkbox 状态变更需要在 tasks.md 和 plan 文件之间保持同步
>
> **改动范围**：改 `schemas/spec-driven/schema.yaml` 的两处 instruction（tasks 和 apply）+ 配合修改 templates 文件
> **不改范围**：opsx 命令、omo 源码、内置 schema、其他 artifact instruction

---

## Context

### OpenSpec schema 工作流与 artifact 关系

OpenSpec 通过 schema（`spec-driven/schema.yaml`）定义工作流。AI 读取 artifact 的 `instruction` 作为 prompt 来执行各阶段，**改
instruction 即可改变 AI 行为**，不需要改 opsx 命令或 omo 源码。

工作流依赖链：

```
proposal ──┬──► specs ──► tasks ──► apply
           │
           └──► design ──┘
```

**变更目录结构：**

```
<project>/
└── openspec/
    └── changes/
        └── <change-name>/              ← openspec-ff-change 创建
            ├── proposal.md             ← 提案（proposal artifact）
            ├── specs/                  ← 规格（specs artifact）
            │   └── <capability>/
            │       └── spec.md
            ├── design.md               ← 设计（design artifact，可选）
            └── tasks.md                ← 任务（tasks artifact）
```

| 阶段 | artifact | 产物（均在 `openspec/changes/\<name\>/` 下） | 面向 | 作用 |
|------|----------|-----------------------------------------|------|------|
| 提案 | `proposal` | `proposal.md` | 决策者 | "做不做？"— Why、What Changes、Capabilities、Impact |
| 规格 | `specs` | `specs/\<capability\>/spec.md` | 测试 | "怎么验证？"— 每个 Requirement 附带 Scenario (WHEN/THEN) |
| 设计 | `design` | `design.md` | 架构师 | "怎么做？"— Goals、Decisions、Risks（可选） |
| 任务 | `tasks` | `tasks.md` | 执行者 | "先做哪个？"— checkbox 清单 |
| 实现 | `apply` | 修改 `tasks.md` | AI | 逐项完成 checkbox |

### OMO Plan 的本质

OMO 的 plan 文件（`.sisyphus/plans/<name>.md`）是一个**聚合文档**，结构如下：

```
## TL;DR               ← 来自 proposal（Why + 核心产出）
## Context             ← 来自 proposal + design（背景 + 决策上下文）
## Work Objectives     ← 来自 specs（验收条件 + Definition of Done）
## Verification Strategy ← 来自 specs Scenario + 额外验证策略
## Execution Strategy  ← 来自 design（技术方案 + 依赖关系）
## TODOs               ← 来自 tasks（checkbox）
## Final Verification Wave
## Commit Strategy
## Success Criteria
```

**核心结论：plan != tasks.md 的拷贝。plan 是 4 个 artifact 的合成物。**

### generates 字段解析机制（源码分析）

OpenSpec 对 `generates` 的解析在 `outputs.js` 中，只有两种模式：

```
// outputs.js - resolveArtifactOutputs()
if (!isGlobPattern(generates)) {
    // 简单路径: proposal.md → openspec/changes/<name>/proposal.md
    //            tasks.md    → openspec/changes/<name>/tasks.md
    return fs.statSync(fullPath).isFile() ? [fullPath] : [];
} else {
    // Glob 模式: specs/**/*.md  → 用 fast-glob 扫描全部匹配文件
    // 匹配后: specs/user-auth/spec.md, specs/data-export/spec.md
    return fg.sync(pattern, { cwd: changeDir });
}
```

| generates 值 | 类型 | 解析方式 | 产物数量 |
|---|---|---|---|
| `proposal.md` | 简单路径 | `changeDir + /proposal.md` | 单文件 |
| `design.md` | 简单路径 | `changeDir + /design.md` | 单文件 |
| `tasks.md` | 简单路径 | `changeDir + /tasks.md` | 单文件 |
| `specs/**/*.md` | glob | fast-glob 遍历 | 多文件（按 capability 分） |

**这决定了 state 检测**：`detectCompleted()` 检查文件是否存在来判断 artifact 是否完成。简单路径检查单文件，glob 检查是否有匹配。

### 模板 vs 产物（Template vs Generated File）

**关键区别**（否则容易混淆）：

- **模板文件**（`templates/proposal.md`）：AI 生成的**骨架/占位结构**，只含注释和格式说明。proposal.md 的模板 `## Why` 下面是空白的，仅作参考
- **产物文件**（`openspec/changes/<name>/proposal.md`）：AI 根据 `instruction` + 用户输入实际写出的完整内容

所以 **proposal.md 产物是包含 change 信息的**（Why、What Changes 等全都填好了），只是 `templates/proposal.md` 模板是空的。AI 通过 `generateInstructions()` 拿到模板内容的注入，再根据 instruction 写出最终产物。

### plan 生成的数据来源

当 tasks.instruction 告诉 AI "生成 plan" 时，AI 应该读取**已经生成好的产物文件**，用**摘要+链接**模式来构建 plan：

| Plan 章节 | 内容策略 | 引用方式 |
|---|---|---|
| `TL;DR` | **1-2 句摘要**（提炼 Why），附来源链接 | 摘要 + 参见 `[proposal.md](openspec/changes/\<name\>/proposal.md)` |
| `Context` | **简要背景摘要** + 链接到 proposal 详情 | 同上 |
| `Work Objectives` | **只列 capability 名称**（不展开 requirement） | 详情走链接 `[spec.md#ADDED-Requirements](openspec/changes/\<name\>/specs/<cap>/spec.md)` |
| `Verification Strategy` | **只写"参见 spec"**，不复制 Scenario | 链接到 `[specs/](openspec/changes/\<name\>/specs/)` |
| `Execution Strategy` | **只写"参见 design.md"** 或注"无需单独设计" | 链接到 `[design.md](openspec/changes/\<name\>/design.md)` |
| `TODOs` | **直接包含 checkbox 列表**（`/start-work` 需要解析） | 从 `tasks.md` 复制任务列表 |
| `Final / Commit / Success` | 标准 OMO 模板 + specs 链接 | — |

**关键原则（摘要+链接模式）：**

- **TL;DR / Context**: 写 1-3 句摘要 + `[file.md](path)` 链接。摘要是**提炼/重述**，不是全文复制
- **Work Objectives / Verification / Execution**: 只列条目名称，不复制正文，详情报文走链接
- **TODOs**: 直接包含 checkbox 列表（`/start-work` 需要解析）
- apply 阶段 AI 会按 `contextFiles` 自动读取所有引用文件，plan 中的链接是给人/工具看的导航
- 总约束：**不全文复制，用摘要+链接模式**

### 模板修改策略（新增）

Metis 分析结论：**模板管结构，instruction 管行为。两者都需要改。**

| 文件 | 当前 | 修改方式 | 原因 |
|------|------|---------|------|
| `templates/spec.md` | 已有固定章节 `## ADDED Requirements`、`#### Scenario:` | **保持不动** | 已有固定锚点结构，AI 可靠复现。plan 可直接引用 `spec.md#ADDED-Requirements` |
| `templates/tasks.md` | `## N. Group` + `- [ ] N.M task` | **修改** → 使用 `## TODOs` + `### Wave` 格式 | 统一 plan 和 tasks.md 的结构，让 `/start-work` 可直接解析 |
| `templates/proposal.md` | `## Why`、`## Capabilities` 等 | **保持不动** | 已有固定章节，不需要改 |
| `templates/design.md` | `## Context`、`## Decisions` 等 | **保持不动** | 已有固定章节，不需要改 |

**spec 的固定章节锚点（已存在，可直接引用）：**

```markdown
## ADDED Requirements          ← plan 可引用: [spec.md#ADDED-Requirements](path)
### Requirement: <name>
#### Scenario: <name>
- **WHEN** <condition>
- **THEN** <expected>

## MODIFIED Requirements       ← plan 可引用: [spec.md#MODIFIED-Requirements](path)

## REMOVED Requirements        ← plan 可引用: [spec.md#REMOVED-Requirements](path)
```

**tasks.md 模板修改方向：**

```markdown
## TODOs

### Wave 1: Setup
- [ ] 1.1 <!-- task -->

### Wave 2: Core
- [ ] 2.1 <!-- task -->
```

这样 tasks.md 本身就直接包含 `/start-work` 需要的 `## TODOs` 章节，同时 AI 生成 tasks.md 时也自然用这个格式——plan 的 TODOs 直接从 tasks.md 复制。

**总结：改 instruction 告诉 AI 行为（双文件生成、引用策略），改 tasks 模板提供结构（Wave 格式），spec 模板已有锚点不动。**

### 问题 1：生成阶段缺 plan 文件

当前 tasks 阶段只生成 `tasks.md`（纯 checkbox 清单），不生成聚合 plan。导致：

- `/start-work` 找不到 plan 文件，无法启动执行
- 即使有 plan，也缺少 proposal/specs/design 的上下文，OMO 执行时不知道 "为什么做" 和 "怎么验证"

### 问题 2：apply 阶段 checkbox 状态无法同步

apply 阶段 AI 在 `tasks.md` 中标记 checkbox，但 `.sisyphus/plans/<change-name>.md` 的 checkbox 不会自动更新。`/start-work`
看到的进度是过期的。

---

## Work Objectives

### 核心目标

在 `schemas/spec-driven/schema.yaml` 中改两处 `instruction` + 配合修改 `templates/tasks.md` 的格式，解决生成和同步两个问题。

### 改动 1：tasks.instruction（第 191-236 行）

**生成任务：**

1. 生成 `tasks.md` — 标准 OpenSpec checkbox 清单（保持现有格式）
2. 生成 `.sisyphus/plans/<change-name>.md` — 聚合 plan，需要从各 artifact 提取内容

**plan 聚合规则（摘要+链接模式，不全文复制）：**

| 计划章节 | 内容策略 | 说明 |
|---------|---------|------|
| `## TL;DR` | **1-2 句摘要** + 引用 `[proposal.md](path)` | 提炼 Why 和核心产出写在 TL;DR 里，详细背景走链接 |
| `## Context` | **简要摘要** + 引用同上 | 2-3 句概括背景，详情走链接 |
| `## Work Objectives` | **只列 capability 名称** + 引用 spec 的 `#ADDED-Requirements` 锚点 | 不展开 requirement 正文，详情走 `[spec.md#ADDED-Requirements](path)` |
| `## Verification Strategy` | **只写"参见 specs"** | 不复制 Scenario，详情走 `[specs/](openspec/changes/\<name\>/specs/)` |
| `## Execution Strategy` | 引用 `[design.md](path)` 或注"无需单独设计" | 设计不存在则标注"直接参见 proposal + specs" |
| `## TODOs` | **直接包含 checkbox 列表** | 从 `tasks.md` 复制 `- [ ]` 任务列表，`/start-work` 需要解析 |
| `## Final Verification Wave` | 标准 OMO 模板 | 4 个并行 review agent，不依赖 change 内容 |
| `## Commit Strategy` | 标准 OMO 模板 | 任务→文件→commit message 映射 |
| `## Success Criteria` | 引用 specs | 不复制正文，详情走 `[spec.md#ADDED-Requirements](path)` |

**格式要求：**

- 子分组使用 `###` 三级标题（如 `### Wave 1: Setup`），不要用 `##` 二级标题
- 包含 `## TODOs` 章节供 `/start-work` 识别
- 每个任务附带 QA Scenarios

### 改动 2：apply.instruction（第 244-246 行）

在现有 instructions 基础上追加 **Task State Sync Protocol**：

- tasks.md 是 checkbox 状态的**唯一数据源**
- normal 流程：每次改 checkbox 时，同时修改 plan 文件中的对应行（eager sync）
- paused 或 all_done 时：验证两个文件 checkbox 状态一致，不一致则执行同步
- 同步方法：读取 tasks.md 的 checkbox 状态，更新 plan 文件 `## TODOs` 节的对应行

**数据流示意：**

```
tasks.md (checkbox 状态)  ←─ 修改 ──  AI 标记完成
       │
       ├──► plan 文件 (eager sync: 每次改 checkbox 同步)
       │     └──► /start-work 读取实时进度
       │
       └──► paused/all_done: 全量校验一致性
```

---

## Verification Strategy

### 验证方法

用任意真实项目端到端测试：

**Problem 1 验证（生成）：**

1. `openspec-ff-change test-plan-gen` → 检查生成产物：
    - ✅ `tasks.md` 存在，包含 `- [ ]` checkbox
    - ✅ `.sisyphus/plans/test-plan-gen.md` 存在
    - ✅ plan 文件包含 TL;DR、Context、Work Objectives、Verification Strategy、TODOs 等章节
    - ✅ plan 中 TODOs 的 checkbox 列表与 tasks.md 一一对应

**Problem 2 验证（同步）：**

2. `openspec-apply-change` → AI 标记几个 checkbox done
    - ✅ plan 文件的对应 checkbox 也同步标记为 done

3. AI 说 "paused" 后
    - ✅ grep 对比两个文件的 checkbox 状态，完全一致

4. `/start-work` 读取 plan
    - ✅ 能正确显示已完成/未完成的任务计数

---

## TODOs

- [ ] 1. 修改 tasks.instruction + tasks 模板 → plan 聚合生成

  **What to do**：
    - **模板修改**：编辑 `schemas/spec-driven/templates/tasks.md`
      - 将 `## N. Group Name` 格式改为 `## TODOs` + `### Wave N: Group Name`
      - `- [ ] N.M Task` 格式不动（仍用 `- [ ]` checkbox）
      - 参考格式：
        ```markdown
        ## TODOs

        ### Wave 1: Setup
        - [ ] 1.1 <!-- task -->

        ### Wave 2: Core
        - [ ] 2.1 <!-- task -->
        ```
    - **instruction 修改**：编辑 `schemas/spec-driven/schema.yaml`
      - 找到 `id: tasks` 的 `instruction`（约第 191-236 行）
      - 替换为新 instruction：
        - 生成 TWO 文件：`tasks.md` + `.sisyphus/plans/<change-name>.md`
        - tasks.md 使用模板的新格式（`## TODOs` + `### Wave`）
        - plan 文件是**聚合文档**，用 markdown 链接引用各产物
        - 每个计划章节的引用方式参见上表
        - 保留 `requires: [specs, design]` 不变

  **Must NOT do**：
    - 不修改 `generates: tasks.md` 字段
    - 不修改 proposal、specs、design 的 instruction
    - 不修改 spec 模板（已有固定锚点，不动）

  **QA Scenarios**：

  ```
  Scenario: tasks 阶段生成两个文件
    Preconditions: 在使用了 spec-driven schema 的项目中执行 openspec-ff-change
    Steps:
      1. openspec-ff-change add test-plan-gen
      2. 检查 tasks.md 是否存在
      3. 检查 .sisyphus/plans/test-plan-gen.md 是否存在
      4. 比较 tasks.md 的 checkbox 列表和 plan 文件 TODOs 节
    Expected Result: 两个文件都存在，checkbox 任务数一致
    Evidence: .sisyphus/evidence/task-1-dual-files.txt

  Scenario: plan 文件包含所有必需章节
    Preconditions: 同上
    Steps:
      1. grep plan 文件是否包含 ## TL;DR
      2. grep plan 文件是否包含 ## Context
      3. grep plan 文件是否包含 ## Work Objectives
      4. grep plan 文件是否包含 ## TODOs
      5. grep plan 文件是否包含 ## Success Criteria
    Expected Result: 所有必需章节都存在
    Evidence: .sisyphus/evidence/task-1-plan-sections.txt

  Scenario: plan 内容来自 proposal/specs
    Preconditions: 同上
    Steps:
      1. 检查 plan 的 Work Objectives 是否引用了 specs 中的 requirement 或 capability 名称
      2. 检查 plan 的 Verification Strategy 是否从 specs Scenario 提取了验证步骤
    Expected Result: plan 不是空模板，确实包含来自 spec 的实际内容
    Evidence: .sisyphus/evidence/task-1-plan-content.txt
  ```

  **Commit**: YES
    - Message: `feat(schema): tasks template + instruction to generate aggregated plan`
    - Files: `schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/tasks.md`

- [ ] 
    2. 修改 apply.instruction → 任务状态同步协议

  **What to do**：
    - 编辑 `schemas/spec-driven/schema.yaml`
    - 找到 `apply.instruction`（约第 244-246 行）
    - 在现有指令基础上追加 Task State Sync Protocol：
        - tasks.md 是 checkbox 状态唯一数据源
        - eager sync：每次改 checkbox 时同时更新 plan 文件的对应行
        - paused/all_done：全量校验，不一致时以 tasks.md 为准覆盖 plan
        - 同步方法：AI 读取 tasks.md 的 checkbox 状态 → 编辑 plan 文件的 TODOs 节匹配
        - 验证命令：`diff <(grep -n '^- \[' tasks.md) <(grep -n '^- \[' .sisyphus/plans/*.md)`

  **Must NOT do**：
    - 不修改 `tracks: tasks.md` 字段
    - 不修改 `requires: [tasks]` 字段
    - 不删除现有 instruction 内容（仅在末尾追加）

  **QA Scenarios**：

  ```
  Scenario: eager sync — 改一个 checkbox 两个文件同时变
    Preconditions: apply 阶段 AI 正在执行任务
    Steps:
      1. AI 标记 task 1.1 为 done（tasks.md 中 `- [x] 1.1`）
      2. 立即检查 plan 文件的对应行是否为 `- [x] 1.1`
    Expected Result: plan 文件的 1.1 也同步标记为 done
    Evidence: .sisyphus/evidence/task-2-eager-sync.txt

  Scenario: paused 时全量校验
    Preconditions: apply 阶段 AI 标记了多个 checkbox
    Steps:
      1. AI 说 "paused"
      2. 执行 diff 命令比较两个文件的 checkbox 状态
    Expected Result: 两个文件的 checkbox 状态完全一致
    Evidence: .sisyphus/evidence/task-2-paused-sync.txt

  Scenario: all_done 时全量校验
    Preconditions: apply 完成全部任务
    Steps:
      1. AI 说 "all_done"
      2. 执行同步验证
    Expected Result: 两个文件 checkbox 全部为 `- [x]`
    Evidence: .sisyphus/evidence/task-2-all-done.txt
  ```

  **Commit**: YES (与任务 1 合并提交，或分开提交)
    - Message: `feat(schema): apply instruction with task state sync protocol`
    - Files: `schemas/spec-driven/schema.yaml`

- [ ] 
    3. 同步 schema.yaml + templates 到本地 openspec 并验证

  **What to do**：
    - 运行 `./scripts/sync-schemas.sh` 将仓库的 schema 同步到 `~/.local/share/openspec/schemas/`
      - 该脚本用 `cp -R` 同步整个 schema 目录，templates 文件会自动跟随
    - 在真实项目中执行 openspec-ff-change 测试生成
    - 在真实项目中执行 openspec-apply-change 测试同步

  **Must NOT do**：
    - 不修改 `generates`、`tracks`、`requires` 等 schema 元数据字段

  **QA Scenarios**：

  ```
  Scenario: 仓库与本地 schema 一致，且 templates 同步成功
    Preconditions: 任务 1、2 完成
    Steps:
      1. 运行 ./scripts/sync-schemas.sh
      2. diff schemas/spec-driven/schema.yaml ~/.local/share/openspec/schemas/spec-driven/schema.yaml
      3. diff schemas/spec-driven/templates/tasks.md ~/.local/share/openspec/schemas/spec-driven/templates/tasks.md
    Expected Result: 无差异
    Evidence: .sisyphus/evidence/task-3-sync-ok.txt
  ```

  **Commit**: 不需要（同步操作，schema.yaml 已在之前的 commit 中）

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — 验证 tasks.instruction 和 apply.instruction 都按预期修改完成
- [ ] F2. **End-to-End Test** — 真实项目 openspec-ff-change → openspec-apply-change 验证生成和同步
- [ ] F3. **Scope Fidelity** — 确认未修改不该改的文件（opsx、omo 源码、模板文件）

---

## Commit Strategy

- **任务 1**: `feat(schema): tasks template + instruction for plan aggregation`
    - Files: `schemas/spec-driven/schema.yaml`, `schemas/spec-driven/templates/tasks.md`
- **任务 2**: `feat(schema): apply instruction with task state sync protocol`
    - Files: `schemas/spec-driven/schema.yaml`
    - (可与任务 1 合并：`feat(schema): plan aggregation + task sync protocol`)
    - 合并时 Files 同上
- **任务 3**: 不需要单独 commit

---

## Success Criteria

- [ ] `openspec-ff-change` 后，`.sisyphus/plans/<name>.md` 自动生成并包含 TL;DR、Context、Work Objectives、TODOs 所有章节
- [ ] plan 的 TODOs checkbox 与 tasks.md 一一对应
- [ ] apply 中改 checkbox 时，plan 文件同步更新
- [ ] paused/all_done 时两个文件完全一致
- [ ] `/start-work` 能正确解析 plan 进度
