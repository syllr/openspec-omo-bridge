## Tasks

### Wave 1: Constitution Output

- [ ] 1.1 Update AGENTS.md
      **What to do**: - Add or update the `## Constitution` section in AGENTS.md - Include tech stack summary, project structure, and key conventions - Keep under ~1,000 tokens (AGENTS.md is always loaded)

      **Must NOT do**:
      - Do not modify existing non-constitution sections of AGENTS.md

      **References**:
      - constitution-design.md (design output)

      **Acceptance Criteria**:
      - `grep -q '## Constitution' AGENTS.md`

- [ ] 1.2 Create `.opencode/skills/constitution/` structure
      **What to do**: - Create SKILL.md with valid YAML frontmatter (`name: constitution`, `description`) - Create reference files under `references/` organized by domain - Reference files: tech-stack.md, project-structure.md, coding-standards/, testing/, architecture.md, gotchas.md - For multi-module projects: organize into per-module subdirectories

      **Must NOT do**:
      - Do not skip SKILL.md frontmatter validation

      **References**:
      - constitution-design.md (structure and content)

      **Acceptance Criteria**:
      - `ls .opencode/skills/constitution/SKILL.md` exists
      - `head -3 .opencode/skills/constitution/SKILL.md | grep -q '^---'`

### Wave 2: Code Sync (Optional)

- [ ] 2.1 Fix code violations
      **What to do**: - Scan project code for patterns that violate the constitution - Fix violations found during scan - Only if user opted for code sync in design phase

      **Must NOT do**:
      - Do not change code architecture, only fix surface-level violations

      **References**:
      - constitution-design.md (code sync section)

      **Acceptance Criteria**:
      - No newly introduced violations detected
