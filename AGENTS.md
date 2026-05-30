# openspec-omo-bridge

Custom OpenSpec `spec-driven` schema that bridges OpenSpec workflows with oh-my-openagent (OMO) plan execution.

## Repository purpose

This is a **configuration repository** — not a code project. It houses a customized OpenSpec schema at
`schemas/spec-driven/` that extends the standard spec-driven workflow to generate OMO-compatible `.omo/plans/` plan
files during the `critic` artifact phase.

## Key files

| Path                               | Purpose                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `schemas/spec-driven/schema.yaml`  | Schema definition. 5 artifacts (proposal → design → specs → tasks → critic) + apply phase |
| `schemas/spec-driven/templates/`   | 5 template files (proposal.md, spec.md, design.md, tasks.md, critic.md)                   |
| `schemas/constitution/schema.yaml` | Simplified 3-stage constitution schema. 3 artifacts (scan → design → apply)               |
| `schemas/constitution/templates/`  | 2 template files (scan.md, design.md)                                                     |
| `scripts/sync-schemas.sh`          | Syncs repo schemas to `~/.local/share/openspec/schemas/`                                  |
| `.opencode/opencode.json`          | OpenCode project config — allows external directory access                                |

## Schema architecture

```
proposal → design ──┬──► specs ──┐
                    │            ├──► tasks ──► critic ──► apply
                    └─────────────┘
```

- `tasks.instruction` generates `tasks.md` (bridge reference to OMO plan, no actual task content)
- `critic.instruction` generates `.omo/plans/<name>.md` (OMO plan with rich sub-fields) + `critic.md` (review report)
- `.omo/plans/<name>.md` uses **9 sections** in spec-driven: TL;DR, Context, Work Objectives, Verification Strategy, Execution Strategy, TODOs, Final Verification Wave, Commit Strategy, Success Criteria (7 sections in constitution, skipping Verification Strategy and Commit Strategy per Design Decision 6)
- Non-Tasks sections use "summary + link" pattern (references `openspec/changes/<name>/` artifacts)
- The plan is parsed by `/start-work` (OMO's Atlas agent)

## Quality gates

The following gates apply to the **spec-driven** schema. Constitution schema has its own quality mechanisms documented in the Constitution Schema section.

1. **Basic structure check** (critic, mandatory) — checks spec dir (removed, no longer needed)
2. **Spec validation** (critic, mandatory) — runs `openspec validate`, if errors show to user and let user decide how to fix
3. **1 parallel Oracle + 1 parallel Metis gap analysis** (critic, after spec validation) — concurrent review of proposal/specs/design coherence before plan generation; both Oracle and Metis use the same review dimensions for double-blind redundant validation
4. **Plan generation** (critic, mandatory) — generate `.omo/plans/<name>.md` via `category="write"`
5. **Plan structure validation** (critic, mandatory) — checks `## TODOs` section exists, `## Final Verification Wave` section exists, and OMO-compatible task format (`N. Task`)
6. **1 parallel Oracle + 1 parallel Metis + 1 parallel Momus review** (critic, mandatory) — concurrent review of plan: Oracle + Metis use the same review dimensions for redundant validation; Momus gives final OKAY/REJECT verdict
7. **Critic verdict** (critic, hard block) — if 🔴 BLOCKED, apply cannot proceed; if ⚠️ CONDITIONAL, user must acknowledge; if ✅ PASS, proceed
8. **Oracle invocation** (critic, mandatory) — spec validation; 如果 Oracle 调用失败则按 fast fail 规则立即停住报错

## Language support

Schema uses `__LANG_PLACEHOLDER__` markers in all 5 artifact + 1 apply instructions (6 for spec-driven, 3 for constitution). The `sync-schemas.sh` script replaces them:

```bash
scripts/sync-schemas.sh --lang zh    # 中文: "所有生成的文档必须使用中文"
scripts/sync-schemas.sh --lang en    # English: "MUST be written in English"
scripts/sync-schemas.sh              # No preference: remove placeholders
```

The sync script uses `rm -rf + cp -R` (not `cp -R dir/ dest/` alone, which has macOS directory overwrite quirks).
Arithmetic uses `$((var + 1))` syntax (not `((var++))`) to avoid `set -e` exit on zero.

## Apply phase sync protocol

`apply.instruction` has a simplified sync approach:

- **tasks.md** is a **bridge reference** file, not a checkbox source.
  It points to `.omo/plans/<change-name>.md` where the actual task definitions and checkbox states live.
- OMO's `/start-work` manages execution state via `.omo/boulder.json` and parses checkboxes directly from the plan file.
- No need to copy checkbox states back to tasks.md — OMO tracks completion internally via `- [x]` in the plan file.

## Spec validation rules

`schema.yaml` specs.instruction includes `openspec validate` rules:

- Requirement must contain uppercase `MUST` or `SHALL` (Chinese "必须" fails)
- Scenario uses exactly 4 `#` (`#### Scenario:`)
- Each requirement ≥1 scenario with WHEN/THEN
- AI is instructed to run `openspec validate <change-name>` after writing specs

## Constitution Schema

A standalone `constitution` schema is available alongside the default `spec-driven` schema. It provides a standardized workflow for project constitution initialization and updates.

**Purpose**: Manage project-level metadata — tech stack, coding standards, architecture constraints, and testing conventions — that exist independently of individual changes.

**Artifact chain** (3 steps):

```
scan → design → apply
```

- **scan**: Ask user to select a constitution dimension (code-conventions, architecture, domain, integration, api, security, testing, observability, release, documentation). Checks existing entries in AGENTS.md for deduplication.
- **design**: Multi-agent research for best practices per dimension. Designs the constitution.yaml output structure.
- **apply**: Creates `docs/constitution/<dimension>/` with reference files and appends entries to AGENTS.md `## Constitution` section. Supports INIT (new), APPEND (new tech_stack), and UPDATE (overwrite existing) modes.

**Output**: AGENTS.md (`## Constitution` section with dimension index) + `docs/constitution/<dimension>/` with reference files.

**Simplification note**: Tasks and critic artifacts were removed because constitution only generates a few documentation files — complex plan generation and multi-agent review (Oracle + Metis + Momus) were overkill. Apply directly creates files based on design output, bypassing `/start-work`.

**Re-entrant design**: Re-run `openspec new change --schema constitution <name>` at any time. Apply detects existing files to determine init/update/incomplete mode.

**Usage**:

```bash
# Create a new constitution change (init or update)
openspec new change --schema constitution my-constitution
```

**Single-module vs multi-module**: For single-module projects, references are flat under `references/`. For multi-module monorepos (e.g., frontend + backend + model-service), references are organized per-module subdirectory. Cross-module architecture constraints go in top-level `architecture.md`.

## Architecture constraints

- **Do NOT modify** `requires`, `generates`, or `tracks` fields — they define the dependency graph
- **Do NOT modify** OMO source code or built-in schemas — this repo only overrides the custom schema layer
- The `design` artifact is **mandatory** (`tasks.requires: [specs, design]`)
- Plan file is **not tracked** by OpenSpec's `detectCompleted()` — it's a side effect of the critic instruction

## CLI testing

Schema changes affect AI behavior during `openspec-ff-change` / `openspec-apply-change`, so testing requires actually
running the AI, not just static validation.

### Setup

```bash
# 1. OpenCode Web 插件必须在 JetBrains IDE 中运行（端口 12396）
# 2. 进入临时测试目录
cd ~/tmp
```

### Run a test

````bash
# 先初始化一个测试项目
mkdir -p /tmp/test-project && cd /tmp/test-project
git init
mkdir -p openspec/schemas/spec-driven .opencode
# 复制当前仓库的 schema 到测试项目
cp -R /Users/yutao/Projects/openspec-omo-bridge/schemas/spec-driven/* openspec/schemas/spec-driven/
# 添加目录权限（避免 AI 申请权限打断流程）
cat > .opencode/opencode.json << 'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "permission": { "external_directory": "allow", "read": "allow", "write": "allow" }
}
EOF
# 处理语言占位符（替换 __LANG_PLACEHOLDER__ 为中文提示）
sed -i '' 's/__LANG_PLACEHOLDER__/**语言**: 所有生成的文档必须使用中文。/g' openspec/schemas/spec-driven/schema.yaml

bunx oh-my-opencode run --attach http://127.0.0.1:12396 "\
在 /tmp/test-project 中，使用 openspec-ff-change 创建一个名为 hello-world 的 change。\
这个 change 的功能是：在项目中添加一个 README.md 文件，内容是 '# Hello World'。\
请完成 proposal → specs → design → tasks 所有阶段，然后执行 apply 完成任务。\
"

- If `Unable to connect`: OpenCode Web plugin not running in IDE
- If `Unauthorized`: restart the IDE plugin
- Clean up test files: `rm -rf /tmp/test-project`

### Parallel tests

For multiple test cases, fan out with `run_in_background=true`:

```typescript
task(
    (category = "quick"),
    (load_skills = []),
    (run_in_background = true),
    (prompt = "...bunx oh-my-opencode run..."),
);
````

## Git

- Remote: `git@github.com:syllr/openspec-omo-bridge.git`
- Branch: `main`
- All commits require user authorization per `git-commit-block` rule
