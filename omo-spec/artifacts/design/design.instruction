requires: [proposal]
__LANG_PLACEHOLDER__

**范围限制：不要修改任何源代码。仅生成 design.md。**

=== Fast Fail Rule (Global) ===

**任何 task()、tool() 或 skill() 调用失败（超时、agent 不可用、返回错误等），立即停止工作流，不得降级、不得重试、不得跳过、不得自行替代执行。**

=== PHASE 1：技术调研 ===

**触发条件**：仅当 `openspec/changes/<change-name>/proposal.md` 中**显式包含 `[NEEDS INVESTIGATION]` 标记**时执行本阶段。
如果 proposal.md 没有 `[NEEDS INVESTIGATION]` 标记 → **跳过整个 PHASE 1**，直接进入 PHASE 2。

对于每个标记为 `[NEEDS INVESTIGATION]` 的点：

 1. **识别调研主题**：从 proposal.md 中提取每个标记点，命名成 kebab-case 的调研主题。例如：`api-signature-format`、`plugin-config-schema`

 2. **单波 librarian 并发调研**：

    所有调研产物保存到 `openspec/changes/<change-name>/research/<topic>/`。

    **所有 librarian 并发**：在同一条消息中发起所有主题的 librarian 任务。每个 librarian 调研其主题的文档或源代码，**直接给出代码示例 + 调用方式**：

    ```
     task(subagent_type="librarian", prompt="调研 plugin.xml 配置声明格式，给出代码示例和调用方式。")
     task(subagent_type="librarian", prompt="调研 OAuth2 PKCE 流程，给出代码示例和调用方式。")
     # ...N 个 topic，全部并发
     ```

     等待所有 librarian 完成后，将每个结果保存到 `research/<topic>/notes.md`


  3. **用户确认**：向用户展示所有调研结果的摘要，**等待用户明确确认后才能继续**。

     **不要自动确认**（避免未审视的调研结论被采纳）。如后续用户消息中表达了与确认/拒绝无关的其他意图，主动提醒调研结果待确认。

    确认后的最终结构（注意：research/ 目录仅在 proposal 包含 `[NEEDS INVESTIGATION]` 标记时创建，notes.md 须含**代码示例 + 调用方式**）：

    ```
    openspec/changes/<change-name>/research/
    ├── index.md                    ← 所有调研点的摘要 + 最终结论
    ├── <topic-1>/                  ← 每个调研点一个子目录
    │   └── notes.md               ← 调研笔记（文档摘录、分析、代码示例、调用方式）
    └── <topic-2>/
        ├── notes.md
        └── ...
    ```

 === PHASE 2：生成 design.md ===

 AI 用 Read/Write 工具直接创建 design.md：

 - 读取 `openspec/changes/<change-name>/proposal.md` — 动机和能力
 - 读取 `openspec/changes/<change-name>/research/` — 技术调研（如果存在）

 设计文档必须包含以下 6 个部分（顺序固定）：

 1. **Context**（上下文）：背景、当前状态、约束、干系人
 2. **Goals / Non-Goals**（目标/非目标）：设计要实现的和明确排除的
 3. **Decisions**（决策）：关键技术选择及理由（为什么选 X 不选 Y？）。包含考虑过的替代方案
 4. **Risks / Trade-offs**（风险/权衡）：已知限制和可能出错的地方。格式：[风险] → 缓解措施
 5. **Migration Plan**（迁移计划）：部署步骤、回滚策略（如适用）
 6. **Open Questions**（未决问题）：尚未解决的决策或未知事项

 关键要求：
 - 关注架构和方法，而非逐行实现
 - 每个设计决策必须对应至少一个 proposal 中的 Capability
 - 如果存在 research findings，在相关 Decisions 中引用，用 `详见 research/<topic>/notes.md` 格式
 - 解释每个技术决策背后的"为什么"
 - 保持聚焦和可执行


  **2.1 验证**：
  1. 6 个必需部分全部存在且顺序正确
  2. `## Decisions` 节中每项决策至少对应 1 个 proposal Capability
  3. 若 research/ 存在，每个 research finding 至少在 1 个 Decision 中被引用
  4. 全部通过 → 继续；任一不通过 → 用 Read/Edit 工具修复 design.md（仅改不通过项），修复后重跑本验证（最多 3 轮，超限后汇总给用户）
