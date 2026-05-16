# Critical Review: <change-name>

## Verdict

**VERDICT**: <!-- ✅ PASS / ⚠️ CONDITIONAL / 🔴 BLOCKED -->

**Summary**: <!-- 一句话结论 -->

---

## 1. Constitution Output Review

> From: Momus Review 1

### Output Completeness

| Output                              | Status  | Notes                                          |
| ----------------------------------- | ------- | ---------------------------------------------- |
| AGENTS.md `## Constitution` section | ✅ / ❌ |                                                |
| SKILL.md frontmatter                | ✅ / ❌ | Must have `name: constitution` + `description` |
| tech-stack.md                       | ✅ / ❌ |                                                |
| architecture.md                     | ✅ / ❌ |                                                |
| coding-standards/                   | ✅ / ❌ |                                                |
| testing/                            | ✅ / ❌ |                                                |
| gotchas.md                          | ✅ / ❌ |                                                |

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->
  - **Suggestion**: <!-- fix suggestion -->

---

## 2. Reference Structure Review

> From: Momus Review 2

### Single-Module Layout (flat)

<!-- Verify: references/ 下直接存放文件，无 module 子目录 -->

### Multi-Module Layout

| Module        | tech-stack | coding-standards | testing | gotchas |
| ------------- | ---------- | ---------------- | ------- | ------- |
| <!-- name --> | ✅ / ❌    | ✅ / ❌          | ✅ / ❌ | ✅ / ❌ |

### Issues Found

- 🔴 / 🟡 / ⚪ <!-- issue description -->

---

## 3. Edge Cases & Risks Review

> From: Momus Review 3

### Uncovered Scenarios

<!-- Spec scenarios not addressed in output -->

### Dependency Issues

<!-- Missing dependencies or configuration requirements -->

---

## 4. Quality Gate Validation

> From: Momus Review 4

| Check                       | Level    | Result  |
| --------------------------- | -------- | ------- |
| SKILL.md frontmatter        | BLOCKING | ✅ / ❌ |
| AGENTS.md `## Constitution` | BLOCKING | ✅ / ❌ |
| Core references exist       | WARNING  | ✅ / ❌ |
| Reference link integrity    | WARNING  | ✅ / ❌ |

---

## 5. Design Alignment Review

> From: Momus Review 5

<!-- Check alignment with constitution-design.md -->

---

## 6. Consolidated Action Items

| Severity | ID  | Description          | Location      | Action              |
| -------- | --- | -------------------- | ------------- | ------------------- |
| 🔴       | B-1 | <!-- description --> | <!-- path --> | <!-- fix -->        |
| 🟡       | W-1 | <!-- description --> | <!-- path --> | <!-- fix -->        |
| ⚪       | I-1 | <!-- description --> | <!-- path --> | <!-- suggestion --> |

---

## Decision

**🔴 BLOCKED** — Resolve all 🔴 issues before apply.
**⚠️ CONDITIONAL** — Resolve 🟡 issues before apply, or acknowledge risks.
**✅ PASS** — No blocking issues. Proceed to apply.
