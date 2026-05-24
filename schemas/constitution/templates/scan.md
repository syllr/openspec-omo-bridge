## Constitution Dimension Scan

<!-- 模板版本：2025-05-22 -->

## Step 1: 选择维度

使用 question 工具询问用户要添加哪个维度的宪法：

```
可选维度列表：
1. code-conventions   — 代码风格/命名/注释/import/函数规范
2. architecture        — 分层/模块/依赖方向
3. domain             — 核心实体/业务模型/值对象/聚合根
4. integration        — 外部API/数据库/消息队列等外部依赖
5. api                — 我对外提供的接口规范
6. security           — 认证/授权/加密/输入验证
7. testing            — 测试策略/覆盖率/Mock规范
8. observability       — 日志/监控/告警/错误处理
9. release            — Git/Commit规范/CI-CD/发布流程
10. documentation     — README/ADR/变更日志

请告诉我要添加哪个维度的宪法（可以说序号或名称）。
```

## Step 2: 检查已有 Constitution

在询问用户后，运行以下命令检查项目中是否已存在该维度的宪法：

```bash
# 检查 docs/constitution/ 是否存在
ls docs/constitution/ 2>/dev/null || echo "docs/constitution/ does not exist"

# 如果存在，读取 AGENTS.md 的 Constitution 区域查看已有条目
test -f AGENTS.md && awk '/constitution-start/,/constitution-end/' AGENTS.md 2>/dev/null || echo "No constitution section found"
```

## Step 3: 确认用户选择

### 已选维度

<!-- 用户选择的维度 -->

### 该维度已有内容（如果存在）

<!-- 从 AGENTS.md 的 Constitution 区域读取已有维度列表 -->

### 用户特定需求

<!-- 通过对话了解用户的具体需求，例如：
- 如果是 code-conventions：需要支持哪些语言？有什么特殊要求？
- 如果是 integration：需要集成哪些外部系统？
- 如果是 api：主要对外暴露哪些接口？
-->

## Step 4: 记录扫描结果

### 确认添加的维度

<!-- 维度名称 -->

### 适用技术栈（如有）

<!-- 例如：Python / Go / TypeScript / 通用（无特定技术栈） -->

### 用户需求摘要

<!-- 用户描述的具体需求 -->

### 已有条目冲突检查

| 检查项                                            | 结果                     |
| ------------------------------------------------- | ------------------------ |
| 该维度是否已存在于 AGENTS.md 的 Constitution 区域 | <!-- 是/否 -->           |
| 是否有重复的技术栈约束                            | <!-- 是/否，具体说明 --> |

## Step 5: 决策汇总

### 已确认

<!-- 用户确认的内容 -->

### 需要 design 阶段调研

<!-- 标记 [NEEDS RESEARCH] 的点 -->

## Decision Log

| 维度          | 决策              | 理由          | 备选              |
| ------------- | ----------------- | ------------- | ----------------- |
| <!-- 维度 --> | <!-- 用户选择 --> | <!-- 原因 --> | <!-- 备选方案 --> |
