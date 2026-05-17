## Tasks

### Wave 1: Constitution Output

- [ ] 1.1 Update AGENTS.md
      **What to do**: - Add or update the `## Constitution` section in AGENTS.md - Include tech stack summary, project structure, and key conventions - Keep under ~1,000 tokens (AGENTS.md is always loaded)

      **Must NOT do**:
      - Do not modify existing non-constitution sections of AGENTS.md

      **Recommended Agent Profile**: category="unspecified-high", load_skills=[]

      **References**:
      - constitution-design.md (design output)

      **Acceptance Criteria**:
      - `grep -q '## Constitution' AGENTS.md`

      **QA Scenarios**:
      <!-- Tool: / Preconditions: / Steps: / Expected: / Evidence path -->

      **Parallelization**: Can Run In Parallel: YES | Parallel Group: Wave 1
      **Evidence**: .sisyphus/evidence/task-1.1-update-agents.snap
      **Commit**: YES
      - Message: `docs(constitution): update AGENTS.md with constitution section`

- [ ] 1.2 Create `.opencode/skills/constitution/` structure
      **What to do**: - Create SKILL.md with valid YAML frontmatter (`name: constitution`, `description`) - Create reference files under `references/` organized by domain - Reference files: tech-stack.md, project-structure.md, coding-standards/, testing/, architecture.md, gotchas.md - For multi-module projects: organize into per-module subdirectories

      **Must NOT do**:
      - Do not skip SKILL.md frontmatter validation

      **Recommended Agent Profile**: category="unspecified-high", load_skills=[]

      **References**:
      - constitution-design.md (structure and content)

      **Acceptance Criteria**:
      - `ls .opencode/skills/constitution/SKILL.md` exists
      - `head -3 .opencode/skills/constitution/SKILL.md | grep -q '^---'`

      **QA Scenarios**:
      <!-- Tool: / Preconditions: / Steps: / Expected: / Evidence path -->

      **Parallelization**: Can Run In Parallel: YES | Parallel Group: Wave 1
      **Evidence**: .sisyphus/evidence/task-1.2-create-structure.snap
      **Commit**: YES
      - Message: `feat(constitution): initialize constitution skill structure`

### Wave 2: Code Sync (Optional)

- [ ] 2.1 Fix code violations
      **What to do**: - Scan project code for patterns that violate the constitution - Fix violations found during scan - Only if user opted for code sync in design phase

      **Must NOT do**:
      - Do not change code architecture, only fix surface-level violations

      **Recommended Agent Profile**: category="unspecified-high", load_skills=[]

      **References**:
      - constitution-design.md (code sync section)

      **Acceptance Criteria**:
      - No newly introduced violations detected

      **QA Scenarios**:
      <!-- Tool: / Preconditions: / Steps: / Expected: / Evidence path -->

      **Parallelization**: Can Run In Parallel: NO | Blocked By: 1.1, 1.2
      **Evidence**: .sisyphus/evidence/task-2.1-fix-violations.log
      **Commit**: YES
      - Message: `refactor(constitution): fix code violations per constitution rules`
