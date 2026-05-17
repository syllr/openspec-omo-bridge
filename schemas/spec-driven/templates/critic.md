# Critical Review: <change-name>

## Verdict

**VERDICT**: <!-- ✅ PASS / ⚠️ CONDITIONAL / 🔴 BLOCKED -->

**Summary**: <!-- 一句话结论 -->

---

## 1. Oracle Review — Content Split & Coverage

> From PHASE 4 tasks.md review + PHASE 7 plan review (Oracle)

### Content Atomicity

| Task | Split Assessment              | Issue             |
| ---- | ----------------------------- | ----------------- |
| N.M  | ✅ 原子化 / ❌ 过粗 / ❌ 过细 | <!-- 具体问题 --> |

### Wave Grouping

<!-- Wave 分组合理性分析 -->

### Coverage Gaps

<!-- Spec requirement 是否有未覆盖的 task -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Source**: <!-- spec/task reference -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 2. Oracle Review — Optimization Suggestions

> From PHASE 4 tasks.md review + PHASE 7 plan review (Oracle)

### Dependency Analysis

| Task | Blocked By | Is Dependency Real? | Suggestion    |
| ---- | ---------- | ------------------- | ------------- |
| N.M  | Task X     | ✅ 真实 / ❌ 虚假   | <!-- 建议 --> |

### Wave Restructuring

<!-- 如果调整 Wave 划分的建议 -->

### Quality Impact

<!-- 每项优化对质量的影响评估 -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 3. Metis Review — OMO Format Compliance

> From PHASE 4 tasks.md review + PHASE 7 plan review (Metis)

### Per-Task Field Completeness

| Task | What to do | Must NOT do | Agent Profile | References | Acceptance Criteria | QA Scenarios | Parallelization | Evidence |
| ---- | ---------- | ----------- | ------------- | ---------- | ------------------- | ------------ | --------------- | -------- |
| N.M  | ✅ / ❌    | ✅ / ❌     | ✅ / ❌       | ✅ / ❌    | ✅ / ❌             | ✅ / ❌      | ✅ / ❌         | ✅ / ❌  |

### QA Scenarios Quality

<!-- QA Scenarios 五要素完整性分析 -->

### Agent Profile Appropriateness

<!-- category 和 skills 匹配度分析 -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Location**: <!-- task reference -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 4. Metis Review — Wave Structure & Optimization

> From PHASE 4 tasks.md review + PHASE 7 plan review (Metis)

### Wave Balance

| Wave | Task Count | Assessment | Suggestion        |
| ---- | ---------- | ---------- | ----------------- |
| 1    | N          | ✅/❌      | <!-- 调整建议 --> |
| 2    | N          | ✅/❌      | <!-- 调整建议 --> |

### Dependency Correctness

<!-- 虚假依赖分析 -->

### Quality-Grounded Optimization

<!-- 每项优化的质量影响标注 -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 5. Oracle Plan Review — Design Alignment

> From PHASE 7 plan review (Oracle)

### Design Alignment

<!-- 设计决策在 plan 中的反映情况 -->

### Verification Strategy

<!-- 验证策略覆盖度 -->

### Success Criteria

<!-- 成功标准的可衡量性 -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->

---

## 6. Metis Plan Review — Structure & QA

> From PHASE 7 plan review (Metis)

### 9-Section Completeness

<!-- 9 节结构完整性检查 -->

### QA Scenarios Quality

<!-- QA 五要素、快乐路径 + 失败路径 -->

### Wave Concurrency

<!-- Wave 依赖和并发合理性 -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->

---

## 7. Momus Plan Review — Executability Gate

> From PHASE 7 plan review (Momus)

### Execution Path

<!-- Wave 依赖、Acceptance Criteria 可执行性、FVW 覆盖度 -->

### Risk Matrix

<!-- 遗漏场景、QA 覆盖、Success Criteria 可衡量性 -->

### Verdict

- ✅ **OKAY** — plan 可执行，无 blocking issues
- ❌ **REJECT** — plan 不可执行，需要修复后重新评审

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->

---

## 8. Consolidated Action Items

| Severity | ID  | Description          | Location           | Source             | Action                 |
| -------- | --- | -------------------- | ------------------ | ------------------ | ---------------------- |
| 🔴       | B-1 | <!-- description --> | <!-- task:line --> | <!-- spec/plan --> | <!-- required fix -->  |
| 🟡       | W-1 | <!-- description --> | <!-- task:line --> | <!-- spec/plan --> | <!-- suggested fix --> |
| ⚪       | I-1 | <!-- description --> | <!-- task:line --> | <!-- spec/plan --> | <!-- suggestion -->    |

---

## Decision

**🔴 BLOCKED** — Resolve all 🔴 issues before apply.
**⚠️ CONDITIONAL** — Resolve 🟡 issues before apply, or acknowledge risks.
**✅ PASS** — No blocking issues. Proceed to apply.
