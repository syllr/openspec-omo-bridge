## Constitution

<!-- constitution-start -->

- **code-conventions** → `docs/constitution/code-conventions/`
  - 通用: 格式化/命名/注释规范
  - python: PEP 8, type hints
  - go: Uber Go Style Guide
  - typescript: ESLint + Prettier
- **architecture** → `docs/constitution/architecture/`
- **domain** → `docs/constitution/domain/`
- **integration** → `docs/constitution/integration/`
  - 通用: 数据库/消息队列规范
  - python: requests, psycopg2
  - go: golang-migrate, rabbitmq
- **api** → `docs/constitution/api/`
- **security** → `docs/constitution/security/`
- **testing** → `docs/constitution/testing/`
- **observability** → `docs/constitution/observability/`
- **release** → `docs/constitution/release/`
- **documentation** → `docs/constitution/documentation/`

<!-- constitution-end -->

<!--
格式说明：
- 每个维度一行，顶层无缩进
- 同一维度有多个技术栈时，在下面用缩进列出
- tech_stack: [] 表示通用（所有技术栈共用）
- tech_stack: [python, go] 表示特定技术栈
- 详细内容见 docs/constitution/<dimension>/constitution.yaml
-->
