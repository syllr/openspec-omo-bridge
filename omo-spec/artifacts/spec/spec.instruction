requires: [proposal, design]
__LANG_PLACEHOLDER__

**范围限制：不要修改任何源代码。仅生成 spec 文件。**

=== Fast Fail Rule (Global) ===

**任何 task()、tool() 或 skill() 调用失败（超时、agent 不可用、返回错误等），立即停止工作流，不得降级、不得重试、不得跳过、不得自行替代执行。**

=== PHASE 1：读取输入 ===

读取以下文件，提取 spec 所需的关键信息：
- `openspec/changes/<change-name>/proposal.md` — 动机和 Capabilities
- `openspec/changes/<change-name>/design.md` — 技术决策和设计细节
- `openspec/changes/<change-name>/research/` — 技术调研结论（如果存在）

**Capabilities 必填检查**：如果 proposal 没有列出任何 Capabilities（New 和 Modified 部分都为空），**停止工作流**。


向用户报告：「🔴 proposal 没有列出任何 Capabilities，无法继续。请补充 proposal 的 New 或 Modified Capabilities。如果此次变更不涉及代码（如纯文档/重构），请考虑其他流程。」

**Modified Capability 路径检查**：对 proposal 中列出的每个 Modified Capability，检查 `openspec/specs/<capability>/spec.md` 是否存在。如果不存在，停止工作流，列出所有缺失路径，询问用户是否改为 New Capability 或先创建基础 spec。

=== PHASE 2：生成 spec 文件 ===

复用 PHASE 1 已读取的 proposal.md、design.md 和 research/ 内容。

用 Write 工具为 proposal 的 Capabilities 部分列出的每个能力创建一个 spec 文件（输出路径统一为 `openspec/changes/<change-name>/specs/<capability>/spec.md`）：
- 新能力：使用 proposal 中确切的 kebab-case 名称
- 修改的能力：使用与 proposal 中 Modified capability 同名的 kebab-case 名称（base spec 位于 `openspec/specs/<capability>/spec.md`）

**VALIDATION RULES**（openspec validate 强制检查以下规则）：
1. 每个 requirement 必须以 `### Requirement: <name>` 开头
2. Requirement 描述中必须包含大写 MUST 或 SHALL，不要用中文"必须"
   - 肯定式："The system MUST ..."
   - 否定式："The system MUST NOT ..."
3. 每个 requirement 必须至少有一个 scenario
4. 每个 scenario 必须以 `#### Scenario: <name>` 开头（恰好 4 个 #）
5. 每个 scenario 正文必须包含 WHEN / THEN 关键词

**Delta 操作**（使用 ## 标题）：
- **ADDED Requirements**（新增需求）：新能力
- **MODIFIED Requirements**（修改的需求）：行为变更，必须包含完整更新内容
- **REMOVED Requirements**（移除的需求）：已废弃功能，必须包含**原因**和**迁移方案**
- **RENAMED Requirements**（重命名的需求）：仅名称变更，使用 FROM:/TO: 格式

**MODIFIED requirements 工作流**：
1. 在 `openspec/specs/<capability>/spec.md` 中找到现有 requirement
2. 复制完整的 requirement 块（从 ### Requirement: 到所有 scenarios）
3. 粘贴到 ## MODIFIED Requirements 下，编辑以反映新行为
4. 确保 Requirement 标题文本与源 spec（openspec/specs/<capability>/spec.md）中原始标题完全一致

**常见陷阱**：使用 MODIFIED 但未复制完整的 requirement 块（遗漏 scenarios 或字段），归档时该 requirement 被部分覆盖，丢失原有细节。
如果添加不改变现有行为的新关注点，请使用 ADDED。

**Example 格式参考**：
```
## ADDED Requirements
### Requirement: User can export data
The system SHALL allow users to export their data in CSV format.
#### Scenario: Successful export
- **WHEN** user clicks "Export" button
- **THEN** system downloads a CSV file with all user data
```


=== PHASE 3：验证 ===

编写完所有 spec 文件后，运行：
`openspec validate <change-name>`

**结果分级处理**（E12）：
- 命令不存在 → 停止，提示用户：「🔴 OpenSpec CLI 未安装。请先运行 `npm install -g @fission-ai/openspec`。」
- 返回 ERROR → 修复所有 ERROR 后重新运行，直到通过
- 返回 WARNING → 展示给用户，由用户决定是否修复（不得自行决定忽略）
- 返回 OK → 展示所有 spec 文件路径及摘要给用户，等待用户 review 后再进入下一个 artifact
