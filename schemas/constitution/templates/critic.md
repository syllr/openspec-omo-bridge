# Critical Review: <change-name>

## Verdict

**VERDICT**: <!-- ✅ PASS / ⚠️ CONDITIONAL / 🔴 BLOCKED -->

**Summary**: <!-- 一句话结论 -->

---

## 1. Oracle Review — tasks.md Content & Plan Design Alignment

> From PHASE 3 tasks.md review + PHASE 6 plan review (Oracle)

### Content Completeness (tasks.md)

<!-- Task atomicity, task vs spec coverage -->

### Design Alignment (plan)

<!-- Plan's Execution Strategy matches constitution-design.md -->

### Success Criteria (plan)

<!-- Success Criteria measurability -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Source**: <!-- file path -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 2. Metis Review — OMO Format & Plan Structure

> From PHASE 3 tasks.md review + PHASE 6 plan review (Metis)

### OMO Format Compliance (tasks.md)

| Task | What to do | Must NOT do | Agent Profile | References | Acceptance Criteria | QA Scenarios | Parallelization | Evidence |
| ---- | ---------- | ----------- | ------------- | ---------- | ------------------- | ------------ | --------------- | -------- |
| N.M  | ✅ / ❌    | ✅ / ❌     | ✅ / ❌       | ✅ / ❌    | ✅ / ❌             | ✅ / ❌      | ✅ / ❌         | ✅ / ❌  |

### Section Structure (plan)

<!-- 7-section completeness (skipping Verification Strategy and Commit Strategy) -->

### QA Scenarios Quality

<!-- Five-element check: Tool/Preconditions/Steps/Expected/Evidence -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Location**: <!-- task reference -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 3. Momus Review — Executability Gate

> From PHASE 6 plan review (Momus)

### Execution Path

<!-- Wave dependencies, Acceptance Criteria executability, FVW coverage -->

### Risk Matrix

<!-- Missing edge cases, QA scenario coverage, Success Criteria measurability -->

### Verdict

- ✅ **OKAY** — plan 可执行，无 blocking issues
- ❌ **REJECT** — plan 不可执行，需要修复后重新评审

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->

---

## 4. Edge Cases & Risks Review

> Aggregated from all reviews

### Uncovered Scenarios

<!-- Spec scenarios not addressed in output -->

### Dependency Issues

<!-- Missing dependencies or configuration requirements -->

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->

---

## 5. Consolidated Action Items

| Severity | ID  | Description          | Location      | Source          | Action              |
| -------- | --- | -------------------- | ------------- | --------------- | ------------------- |
| 🔴       | B-1 | <!-- description --> | <!-- path --> | <!-- review --> | <!-- fix -->        |
| 🟡       | W-1 | <!-- description --> | <!-- path --> | <!-- review --> | <!-- fix -->        |
| ⚪       | I-1 | <!-- description --> | <!-- path --> | <!-- review --> | <!-- suggestion --> |

---

## Decision

**🔴 BLOCKED** — Resolve all 🔴 issues before apply.
**⚠️ CONDITIONAL** — Resolve 🟡 issues before apply, or acknowledge risks.
**✅ PASS** — No blocking issues. Proceed to apply.
