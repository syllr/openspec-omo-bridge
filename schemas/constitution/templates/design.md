## Context

<!-- 背景：来自 scan.md 的维度选择和用户需求 -->

### 已选维度

<!-- 维度名称：code-conventions / architecture / domain / integration / api / security / testing / observability / release / documentation -->

### 适用技术栈

<!-- 例如：Python / Go / TypeScript / 通用（无特定技术栈） -->

### 用户需求摘要

<!-- 来自 scan.md 的用户具体需求 -->

---

## 10 维度全景图

以下列出所有 10 个维度供参考。本阶段只需聚焦「已选维度」，其他维度保持占位符即可。

| #   | 维度                 | 说明                               | 本次是否聚焦   |
| --- | -------------------- | ---------------------------------- | -------------- |
| 1   | **code-conventions** | 代码风格/命名/注释/import/函数规范 | <!-- 是/否 --> |
| 2   | **architecture**     | 分层/模块/依赖方向                 | <!-- 是/否 --> |
| 3   | **domain**           | 核心实体/业务模型/值对象/聚合根    | <!-- 是/否 --> |
| 4   | **integration**      | 外部API/数据库/消息队列等外部依赖  | <!-- 是/否 --> |
| 5   | **api**              | 我对外提供的接口规范               | <!-- 是/否 --> |
| 6   | **security**         | 认证/授权/加密/输入验证            | <!-- 是/否 --> |
| 7   | **testing**          | 测试策略/覆盖率/Mock规范           | <!-- 是/否 --> |
| 8   | **observability**    | 日志/监控/告警/错误处理            | <!-- 是/否 --> |
| 9   | **release**          | Git/Commit规范/CI-CD/发布流程      | <!-- 是/否 --> |
| 10  | **documentation**    | README/ADR/变更日志                | <!-- 是/否 --> |

---

## 聚焦维度：<!-- 已选维度 -->

### 维度说明

<!-- 该维度的定义和范围 -->

### 业界最佳实践

#### 参考资料

| 来源                                              | 关键内容      | URL           |
| ------------------------------------------------- | ------------- | ------------- |
| <!-- Google Style Guide / Uber Go Guide / ... --> | <!-- 摘要 --> | <!-- 链接 --> |

#### 核心规则提炼

<!-- 从参考资料中提炼的关键规则 -->

### 技术栈适配（如果适用）

| 技术栈              | 特有规则                        | 参考来源      |
| ------------------- | ------------------------------- | ------------- |
| <!-- Python -->     | <!-- PEP 8, type hints 规范 --> | <!-- 链接 --> |
| <!-- Go -->         |                                 |               |
| <!-- TypeScript --> |                                 |               |

### 与现有 Constitution 的关系

<!-- 检查其他维度是否有交叉，列出需要一致的点 -->

---

## 输出结构设计

### 目标文件

本 design 阶段结束后，将生成以下文件：

```
docs/constitution/<dimension>/
├── constitution.yaml      # 元数据表
├── universal.md          # 通用规范（所有技术栈共用）
├── python.md             # Python 特有规范（如果适用）
├── go.md                # Go 特有规范（如果适用）
└── typescript.md        # TypeScript 特有规范（如果适用）
```

### constitution.yaml 结构

```yaml
dimension: <dimension>
description: <维度说明>
items:
  - tech_stack: [] # 空 = 通用
    status: active # active / proposed / under_review
    summary: <规范摘要>
    file: universal.md

  - tech_stack: [python]
    status: active
    summary: <规范摘要>
    file: python.md
```

---

## Open Questions

<!-- 设计阶段未解决的问题，标记 [NEEDS DECISION] -->

## Research Log

| 主题     | 调研来源 | 关键结论 |
| -------- | -------- | -------- |
| <!-- --> | <!-- --> | <!-- --> |
