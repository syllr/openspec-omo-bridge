## ADDED Requirements

### Requirement: Independent constitution schema

The system SHALL provide a standalone `constitution` schema that operates independently from the `spec-driven` schema, with its own artifact chain (scan → design → tasks → critic → apply). The schema SHALL NOT modify or depend on the existing spec-driven artifact chain, but SHALL reuse the critic and apply mechanisms from spec-driven.

#### Scenario: Schema registration

- **WHEN** the user runs `openspec new change --schema constitution <name>`
- **THEN** the system SHALL create a new change using the constitution schema, not the spec-driven schema

#### Scenario: Zero impact on spec-driven

- **WHEN** a change is created using the constitution schema
- **THEN** the system SHALL NOT modify any files under `schemas/spec-driven/`

### Requirement: Five-step artifact chain

The constitution schema SHALL define exactly five artifacts executed sequentially: `scan`, `design`, `tasks`, `critic`, and `apply`. The critic and apply artifacts SHALL reuse the mechanisms from the spec-driven schema.

#### Scenario: Scan produces tech-stack analysis

- **WHEN** the scan artifact is executed
- **THEN** the system SHALL analyze the project's configuration files (`package.json`, `go.mod`, `pyproject.toml`, `Cargo.toml`, etc.) and produce `scan.md` with a structured tech-stack report

#### Scenario: Scan uses multi-agent parallel research for existing projects

- **WHEN** the scan artifact runs for an existing project with code
- **THEN** the system SHALL first analyze the current tech stack, then use `/openspec-explore` to discuss with the user, and finally launch 3 to 5 librarian agents in parallel to research specific technology decisions

#### Scenario: Scan recommends tech stack for new projects

- **WHEN** the scan artifact runs for an empty project
- **THEN** the system SHALL ask the user about project requirements and provide technology recommendations, using librarian agents for uncertain decisions

#### Scenario: Design produces constitution design

- **WHEN** the design artifact is executed and `scan.md` exists
- **THEN** the system SHALL produce `constitution-design.md` with the proposed constitution structure, chapter organization, and module layout

#### Scenario: Design uses multi-agent research for best practices

- **WHEN** the design artifact runs
- **THEN** the system SHALL launch multiple librarian agents in parallel to research best practices for each confirmed technology, then use `/summarize-research` to write structured reference documents

#### Scenario: Design optionally asks about code sync

- **WHEN** the design artifact runs and the tech stack is confirmed
- **THEN** the system SHALL use a question tool to ask the user whether to scan existing code for constitution violations
- **AND IF** the user confirms, the system SHALL add code sync logic to the design and constitution-design.md, generating additional tasks for fixing violations
- **AND IF** the user declines, the system SHALL skip code syncing and proceed with the standard task list only

#### Scenario: Tasks produces execution plan

- **WHEN** the tasks artifact is executed and `constitution-design.md` exists
- **THEN** the system SHALL produce `tasks.md` with two mandatory tasks: update AGENTS.md with the constitution section, and create or update `.opencode/skills/constitution/` skill files and references
- **AND IF** the user chose to sync constitution with code during the design phase, the system SHALL include a third task: fix existing code violations that do not conform to the constitution

#### Scenario: Critic enforces constitution-specific quality gates

- **WHEN** the critic artifact is executed
- **THEN** the system SHALL run 5 parallel Momus reviews on the constitution output
- **AND** the critic SHALL validate: SKILL.md frontmatter format (blocking), AGENTS.md constitution section existence (blocking), core reference file existence (warning), reference link integrity (warning)
- **AND** core reference files SHALL be defined as: for single-module projects, `tech-stack.md` and `architecture.md`; for multi-module projects, each module's `tech-stack.md` plus top-level `architecture.md`
- **AND** the critic SHALL skip `openspec validate` (there are no specs to validate)

#### Scenario: Apply writes final files

- **WHEN** the apply artifact is executed
- **THEN** the system SHALL write the final output files: update `AGENTS.md` with the `## Constitution` section, create skill files under `.opencode/skills/constitution/`, and write reference documents under `.opencode/skills/constitution/references/`

#### Scenario: Artifacts respect dependency order

- **WHEN** the user attempts to run an artifact before its dependencies are complete
- **THEN** the system SHALL block execution with a missing dependency error

### Requirement: OpenCode SKILL.md output format

The constitution schema SHALL use the OpenCode SKILL.md format with YAML frontmatter as the primary output format for detailed rules and standards. The generated skill file MUST contain valid frontmatter with `name` and `description` fields.

#### Scenario: Skill file has valid frontmatter

- **WHEN** the apply artifact creates `.opencode/skills/constitution/SKILL.md`
- **THEN** the file SHALL start and end with `---` delimiters and contain `name: constitution` and a non-empty `description` field

#### Scenario: Skill is auto-discoverable

- **WHEN** the SKILL.md file exists at `.opencode/skills/constitution/SKILL.md`
- **THEN** the OpenCode system SHALL automatically detect and load it based on the `description` field matching the AI task context

### Requirement: Multi-level knowledge index

The generated constitution SHALL use a three-layer knowledge architecture: AGENTS.md at the project root as the top-level index (approximately 1,000 tokens, always loaded), `.opencode/skills/constitution/SKILL.md` as the detailed body (loaded on demand), and references as deep reference files (loaded when referenced).

#### Scenario: AGENTS.md contains constitution index

- **WHEN** the apply artifact runs
- **THEN** the system SHALL add or update a `## Constitution` section in `AGENTS.md` that summarizes the tech stack, project structure, and key conventions

#### Scenario: References are organized by domain

- **WHEN** the apply artifact creates reference files under `.opencode/skills/constitution/references/`
- **THEN** the files SHALL be organized by domain (tech-stack.md, project-structure.md, coding-standards/, testing/, architecture.md, gotchas.md), not by module

### Requirement: Single-module directory structure

For projects with a single module, the constitution SHALL use a flat directory structure under `.opencode/skills/constitution/references/`.

#### Scenario: Flat layout for single-module project

- **WHEN** the apply artifact runs for a single-module project
- **THEN** the reference files SHALL be placed directly under `.opencode/skills/constitution/references/` without additional subdirectories

### Requirement: Multi-module monorepo directory structure

For projects with multiple modules (e.g., monorepo with frontend, backend, and model-service), the constitution SHALL organize references into per-module subdirectories under `.opencode/skills/constitution/references/`. Each module SHALL have its own self-contained set of reference files. Cross-module architecture constraints SHALL be placed in a top-level `architecture.md`.

#### Scenario: Per-module subdirectories

- **WHEN** the apply artifact runs for a multi-module project and `scan.md` identifies distinct modules
- **THEN** the system SHALL create per-module subdirectories under `.opencode/skills/constitution/references/` (e.g., `user-frontend/`, `backend-api/`, `model-server/`)

#### Scenario: Each module is self-contained

- **WHEN** a per-module subdirectory is created
- **THEN** it SHALL contain its own `tech-stack.md`, `project-structure.md`, `coding-standards/`, `testing/`, and `gotchas.md`

#### Scenario: Cross-module architecture at top level

- **WHEN** the project has multiple modules
- **THEN** the system SHALL create an `architecture.md` directly under `.opencode/skills/constitution/references/` that describes cross-module dependencies and communication protocols

### Requirement: Re-entrant design with fixed naming

The constitution schema SHALL be re-entrant: users SHALL be able to re-run the constitution workflow at any time. All output files MUST use fixed paths and names (no timestamps or random identifiers). The apply artifact SHALL detect whether this is an initial creation or an update by checking for existing files.

#### Scenario: Init mode detection

- **WHEN** the apply artifact runs and both `.opencode/skills/constitution/SKILL.md` does not exist and `AGENTS.md` has no `## Constitution` section
- **THEN** the system SHALL operate in init mode and create all files fresh

#### Scenario: Update mode detection

- **WHEN** the apply artifact runs and both `.opencode/skills/constitution/SKILL.md` exists and `AGENTS.md` has a `## Constitution` section
- **THEN** the system SHALL operate in update mode: diff the existing content and prompt the user to confirm which parts to keep or replace

#### Scenario: Incomplete state handling

- **WHEN** the apply artifact runs and only one of `.opencode/skills/constitution/SKILL.md` or `AGENTS.md`'s `## Constitution` section exists (partial state)
- **THEN** the system SHALL notify the user of the inconsistent state and prompt with options: overwrite all, complete the missing parts, or abort

#### Scenario: AGENTS.md merge strategy

- **WHEN** the apply artifact runs in init mode and AGENTS.md already exists (without `## Constitution`)
- **THEN** the system SHALL append the constitution section to the end of AGENTS.md without modifying existing content

#### Scenario: User-initiated updates

- **WHEN** the user runs `openspec new change --schema constitution <name>` again for the same project (with any change name)
- **THEN** the system SHALL detect the existing project-level files and enter update mode regardless of the new change directory name

### Requirement: User-driven constitution updates

The constitution SHALL NOT be updated automatically. Technology stack upgrades or structural changes SHALL require the user to explicitly re-run the constitution workflow. The update flow SHALL diff existing content against newly generated content and ask the user which parts to retain or replace.

#### Scenario: Update preserves user customizations

- **WHEN** the user runs the constitution workflow in update mode and chooses to retain existing content for certain sections
- **THEN** the system SHALL preserve the user's custom content and only update the sections the user agreed to replace
