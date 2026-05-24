## Context

<!-- 背景：来自 scan.md 的维度选择和用户需求 -->

### 已选维度

<!-- 维度名称：code-conventions / architecture / domain / integration / api / security / testing / observability / release / documentation -->

### 适用技术栈

<!-- 例如：Python / Go / TypeScript / 通用（无特定技术栈） -->

### 用户需求摘要

<!-- 来自 scan.md 的用户具体需求 -->

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
├── universal.md          # 通用规范（所有技术栈共用）
├── python.md             # Python 特有规范（如果适用）
├── go.md                # Go 特有规范（如果适用）
└── typescript.md        # TypeScript 特有规范（如果适用）
```

### AGENTS.md 中该维度的展示内容

本次新增的维度将在 AGENTS.md 的 Constitution 区域中以以下格式展示：

```
- **<dimension>** — <维度描述>
  - `<tech_stack>` <条目描述>
```

每个条目对应一个 .md 文件。

---

## Open Questions

<!-- 设计阶段未解决的问题，标记 [NEEDS DECISION] -->

## Research Log

| 主题     | 调研来源 | 关键结论 |
| -------- | -------- | -------- |
| <!-- --> | <!-- --> | <!-- --> |
