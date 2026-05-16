## Why

当前 `spec-driven` schema 只关注"每次变更"的流程（proposal → specs → design → tasks → critic → apply），但缺少项目层面的**元数据管理**——也就是项目的"宪法"：技术栈、编码规范、架构约束、测试规范等。

这些信息不属于某一次 change，而是项目始终存在的元数据。目前宪法需要手动编写 AGENTS.md，没有标准化的生成流程。

Spec Kit 有 `/speckit.constitution`、GSD 有 `NEW_PROJECT.md`，它们都不属于变更流程，而是独立的一步。

## What Changes

**新增一个独立的 `constitution` schema，用于项目宪法的初始化与更新。**

与 `spec-driven` 不同，宪法流程不是变更管理，而是项目初始化。参考 GSD 的 `/gsd-new-project`（3 个中间产物），宪法流程应该有多个步骤，每步产出中间文档：

```
constitution schema:
  scan (扫描) → design (设计) → tasks (计划) → critic (审查) → apply (执行)

spec-driven schema（不变）:
  proposal → specs → design → tasks → critic → apply
```

Constitution 的 critic 和 apply 复用 spec-driven 的成熟机制（Momus 5 路审查 + eager sync），但跳过 proposal → specs 阶段（宪法不是变更）。

**五步流程：**

| 步骤 | artifact | 中间产物                               | 说明                                                          |
| ---- | -------- | -------------------------------------- | ------------------------------------------------------------- |
| 1    | `scan`   | `scan.md`                              | 技术栈扫描 + 多 agent 并行调研 + 与用户商讨技术选型           |
| 2    | `design` | `constitution-design.md`               | 基于确定的技术栈，多 agent 调研最佳实践，产出 reference 文档  |
| 3    | `tasks`  | `tasks.md`                             | 简约执行计划（修改 AGENTS.md + 创建/更新 constitution skill） |
| 4    | `critic` | `critic.md`                            | 5 路并行 Momus 审查 + 质量门禁验证                            |
| 5    | `apply`  | 写入 AGENTS.md + SKILL.md + references | Eager sync + diff 一致性验证，检测 init/update 模式           |

**阶段一：scan（技术栈扫描）**

借鉴 GSD `/gsd-map-codebase` 的 4 路并行研究员模式，scan 阶段并行分析多个维度：

| 扫描维度   | 参考来源                               | 扫描方式                                        |
| ---------- | -------------------------------------- | ----------------------------------------------- |
| 语言与框架 | GSD 技术栈研究员 + Claude Code `/init` | 读 package.json / go.mod / pyproject.toml       |
| 项目结构   | GSD 架构研究员                         | Glob 目录结构，统计文件分布                     |
| 构建工具   | GSD 技术栈研究员                       | 读 vite.config.js / webpack.config / Dockerfile |
| 测试框架   | GSD 功能研究员                         | Grep 测试文件（test/spec/e2e）                  |

产出：`scan.md` — 结构化技术栈分析报告

**阶段二：design（宪法设计）**

| 借鉴来源                         | 做法                                                | 应用                      |
| -------------------------------- | --------------------------------------------------- | ------------------------- |
| Spec Kit `/speckit.constitution` | 宪法模板有严格的质量检查点（SC-XXX）                | 宪法模板定义标准章节结构  |
| GSD `/gsd-new-project`           | 交互式问答持续提问直到理解                          | AI 先问清楚技术偏好再设计 |
| Harmony `rules/`                 | 按领域拆分规则文件（security/coding-style/testing） | 宪法按领域分章节          |

产出：`constitution-design.md` — 宪法结构设计文档

**阶段三～五：tasks → critic → apply**

借鉴 spec-driven 的成熟机制：

| 阶段   | 借鉴来源           | 做法                                                |
| ------ | ------------------ | --------------------------------------------------- |
| tasks  | spec-driven tasks  | 简约 checkbox 任务清单                              |
| critic | spec-driven critic | 5 路并行 Momus 审查 + 质量门禁                      |
| apply  | spec-driven apply  | Eager sync + diff 一致性验证 + init/update 模式检测 |

**最终产物**（apply 阶段写入）：

```
AGENTS.md                              ← 高层索引（技术栈/项目结构/常用命令）
.opencode/
└── skills/
    └── constitution/
        ├── SKILL.md                   ← 详细宪法规范（AI 按需加载）
        └── references/
            ├── coding-standards.md     ← 编码规范详细版
            ├── testing.md              ← 测试规范详细版
            └── architecture.md          ← 架构约束详细版
```

## Capabilities

### New Capabilities

- `constitution-schema`: 独立的宪法 schema
  - 五步流程：`scan` → `design` → `tasks` → `critic` → `apply`
  - critic 和 apply 复用 spec-driven 的成熟机制（Momus 审查 + eager sync）
  - 中间产物：`scan.md`（技术栈分析）+ `constitution-design.md`（宪法设计）
  - 最终产物：AGENTS.md + `.opencode/skills/constitution/SKILL.md` + references
  - 使用场景：新项目初始化时跑一次，后续按需重新生成（可重入设计）

### Modified Capabilities

- `spec-driven` schema：**不变**。宪法不属于变更流程，不需要加进去

## Impact

- `schemas/constitution/` — 新增完整 schema（含模板）
- `schemas/spec-driven/` — **不受影响**
- `scripts/sync-schemas.sh` — 需适配新增 schema 目录的同步
- 用户项目的 `AGENTS.md` — 新增 `## Constitution` 章节
- 用户项目的 `.opencode/skills/constitution/` — 新增宪法 skill 文件和 references
- 用户通过 `openspec-ff-change --schema constitution` 调用
