# OMO Plan Format Research Findings

Date: 2026-05-14
Source: deepwiki.com/code-yeongyu/oh-my-opencode documentation

---

## 1. OMO Plan Format Standards

### Location
- Plan files: `.sisyphus/plans/<name>.md`
- Draft files: `.sisyphus/drafts/<topic-slug>.md`
- Template source: `src/agents/prometheus/plan-template.ts`

### Mandatory Sections (in order)

```
# {Plan Title}

## TL;DR
## Context
  - Original Request
  - Interview Summary
  - Metis Review
## Work Objectives
  - Core Objective
  - Concrete Deliverables
  - Definition of Done
  - Must Have
  - Must NOT Have (Guardrails)
## Verification Strategy (MANDATORY)
## Execution Strategy
  - Parallel Execution Waves (Wave 1, 2, 3, 4, FINAL)
  - Dependency Matrix
  - Agent Dispatch Summary
## TODOs
  - Individual task entries with specific sub-sections
## Final Verification Wave (MANDATORY)
  - F1. Plan Compliance Audit (oracle)
  - F2. Code Quality Review (unspecified-high)
  - F3. Real Manual QA (unspecified-high)
  - F4. Scope Fidelity Check (deep)
## Commit Strategy
## Success Criteria
```

---

## 2. TODOs Section Format

### Checkbox Syntax
```markdown
- [ ] Task Number. [Task Title]
```

### Per-Task Sub-Sections (ALL MANDATORY)

```markdown
- [ ] 1. [Task Title]

  **What to do**:
  - [Clear implementation steps]

  **Must NOT do**:
  - [Specific exclusions]

  **Recommended Agent Profile**:
  - **Category**: `[visual-engineering | ultrabrain | artistry | quick | unspecified-low | unspecified-high | writing]`
  - **Skills**: `[\`skill-1\`, \`skill-2\`]`

  **Parallelization**:
  - **Can Run In Parallel**: YES | NO
  - **Parallel Group**: Wave N (with Tasks X, Y)
  - **Blocks**: [Tasks that depend on this]
  - **Blocked By**: [Tasks this depends on] | None

  **References** (CRITICAL - Be Exhaustive):
  - **Pattern References**: `src/file.ts:line-line` - Description
  - **API/Type References**: `src/types/file.ts:TypeName` - Description
  - **Test References**: `src/__tests__/file.test.ts:describe("name")` - Description
  - **External References**: Official docs URL - Description

  **Acceptance Criteria**:
  - [ ] [Criterion with verifiable command]
  - [ ] [Test file created: path]
  - [ ] `command → Expected output`

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: [Happy path]
    Tool: [Playwright | interactive_bash | Bash (curl)]
    Preconditions: [Exact setup state]
    Steps:
      1. [Exact action — specific selector/endpoint]
      2. [Next action]
      3. [Assertion — exact expected value]
    Expected Result: [Concrete observable result]
    Failure Indicators: [What specifically means failure]
    Evidence: .sisyphus/evidence/task-{N}-{scenario-slug}.{ext}
  ```

  **Commit**: YES | NO (groups with N)
  - Message: `type(scope): desc`
```

### Key Requirements
- **Implementation + Test = ONE Task** — never separate
- **A task WITHOUT QA Scenarios is INCOMPLETE**
- Minimum: 1 happy path + 1 failure/edge case per task

---

## 3. Integration with OpenCode's Todo System

### Dual System Architecture

| System | Storage | API | Tool Names |
|--------|---------|-----|------------|
| Legacy Todo | OpenCode native | `todowrite`, `todoread`, `todolist` | OpenCode built-in |
| New Task System | `.sisyphus/tasks/*.json` | `task_create`, `task_update`, `task_get`, `task_list` | oh-my-opencode custom |

### How /start-work Works

1. Reads plan from `.sisyphus/plans/<name>.md`
2. Creates `boulder.json` tracking active plan
3. Parses `## TODOs` section into executable work items
4. Uses `todo-continuation-enforcer` hook to monitor progress
5. Injects continuation prompts when session is idle

### Todo Continuation Enforcer

- Hook monitors session idle events
- Exponential backoff: 30s → 60s → 120s → 240s → 5min max
- Injects prompt: "You have incomplete todos. Continue working on them."
- Configurable via `disabled_hooks` or `new_task_system_enabled`

---

## 4. Momus Plan Quality Criteria (What Makes a Plan "Pass")

### Momus Approval Thresholds (ALL required)

| Threshold | Requirement |
|-----------|-------------|
| File references | 100% verified |
| Reference sources | ≥80% of tasks have clear reference sources |
| Acceptance criteria | ≥90% of tasks have concrete, verifiable criteria |
| Business logic | Zero assumptions — all decisions explicit |
| Critical red flags | Zero blocking issues |

### Common Momus Rejection Reasons

1. File references not verified (use `Read` to confirm paths exist)
2. Tasks lack concrete acceptance criteria ("works correctly" fails)
3. Business logic assumptions without evidence
4. Missing QA scenarios
5. Over-engineering / scope creep

### Fix Strategy
- Fix ALL issues in one edit, then resubmit
- No maximum retry limit — loop continues until OKAY

---

## 5. Final Verification Wave Format (F1-F4)

### Structure

```markdown
## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. Verify "Must Have" exists. Search for "Must NOT Have" patterns.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review for: `as any`/`@ts-ignore`, empty catches, console.log, commented-out code.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Execute EVERY QA scenario from EVERY task. Test cross-task integration.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — no missing, no creep.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`
```

### Momus Loop vs Final Verification

| Aspect | Momus Loop | Final Verification Wave |
|--------|-----------|----------------------|
| When | Before execution (plan quality) | After implementation |
| Who | Momus agent | 4 parallel agents (F1-F4) |
| Purpose | Plan completeness | Implementation correctness |
| Retry | Until OKAY | Reject → fix → re-run |

---

## 6. Known Issues / Tips

### Conflicts: Plan TODOs vs OpenCode Todo Tracking

1. **Dual tracking risk**: Plan file has `- [ ]` checkboxes, but OpenCode also has `todowrite`
2. **Avoid duplicate tracking**: Only use ONE system — prefer plan file checkboxes for plan-driven work
3. **todo-continuation-enforcer monitors**: Both legacy todos and new task system

### Best Practices

1. **Use plan file checkboxes** for Prometheus → Atlas workflow
2. **Reference patterns**: Every task needs specific file:line references
3. **QA scenarios are MANDATORY**: No exceptions, task is incomplete without them
4. **Evidence files required**: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
5. **Parallelization labeling**: Every task needs Wave number
6. **Agent profile required**: Category + Skills justification per task

### Plan Template Location
- Source: `src/agents/prometheus/plan-template.ts`
- Contains `PROMETHEUS_PLAN_TEMPLATE` constant

### File System Structure
```
.sisyphus/
├── drafts/              # Interview working state
├── plans/              # Finalized execution plans
├── boulder.json         # Execution state
├── notepads/           # Wisdom accumulation
│   └── {plan-name}/
│       ├── learnings.md
│       ├── decisions.md
│       ├── issues.md
│       └── problems.md
└── evidence/           # QA artifacts
    └── task-{N}-{slug}.{ext}
```

---

## Summary: Key Takeaways for OpenSpec Schema

For improving `tasks.instruction` in OpenSpec schema:

1. **TODOs section must use**: `- [ ] N.` checkbox syntax
2. **Every task needs ALL sub-sections**: What/Must NOT/Agent/Parallelization/References/Acceptance/QA Scenarios
3. **QA Scenarios mandatory**: Minimum 1 happy path + 1 failure case
4. **Evidence path required**: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
5. **F1-F4 verification wave at end**: 4 parallel agents, ALL must approve
6. **Momus approval criteria**: 100% file refs, ≥80% refs with sources, ≥90% with concrete criteria
7. **Avoid dual tracking**: Use plan checkboxes OR OpenCode todos, not both
