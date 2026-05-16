# openspec-omo-bridge

Custom OpenSpec `spec-driven` schema that bridges OpenSpec workflows with oh-my-openagent (OMO) plan execution.

## Repository purpose

This is a **configuration repository** — not a code project. It houses a customized OpenSpec schema at
`schemas/spec-driven/` that extends the standard spec-driven workflow to generate OMO-compatible `.sisyphus/plans/` plan
files during the `tasks` artifact phase.

## Key files

| Path                               | Purpose                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `schemas/spec-driven/schema.yaml`  | Schema definition. 5 artifacts: proposal → specs → design → tasks → apply            |
| `schemas/spec-driven/templates/`   | 4 template files (proposal.md, spec.md, design.md, tasks.md)                         |
| `schemas/constitution/schema.yaml` | Independent constitution schema. 5 artifacts: scan → design → tasks → critic → apply |
| `schemas/constitution/templates/`  | 4 template files (scan.md, constitution-design.md, tasks.md, critic.md)              |
| `scripts/sync-schemas.sh`          | Syncs repo schemas to `~/.local/share/openspec/schemas/`                             |
| `.opencode/opencode.json`          | OpenCode project config — allows external directory access                           |

## Schema architecture

```
proposal ──┬──► specs ──┐
           │            ├──► tasks ──► critic ──► apply
           └──► design ──┘
```

- `tasks.instruction` generates `tasks.md` (simple checkbox list)
- `critic.instruction` generates `.sisyphus/plans/<name>.md` (OMO plan with rich sub-fields) + `critic.md` (review report)
- `.sisyphus/plans/<name>.md` uses **9 sections**: TL;DR, Context, Work Objectives, Verification Strategy, Execution Strategy, Tasks, Final Verification Wave, Commit Strategy, Success Criteria
- Non-Tasks sections use "summary + link" pattern (references `openspec/changes/<name>/` artifacts)
- The plan is parsed by `/start-work` (OMO's Atlas agent)

## Quality gates

1. **Spec validation** (critic, mandatory) — runs `openspec validate`, if errors consult Oracle for fix guidance
2. **Plan generation** (critic, after validation passes) — generates the 9-section plan
3. **Plan structure validation** (critic, mandatory) — 4 grep checks verify sections exist and checkbox counts match
4. **5 parallel Momus reviews** (critic, mandatory) — comprehensive review: spec compliance, plan quality, edge cases, execution feasibility, design alignment
5. **Critic verdict** (critic, hard block) — if 🔴 BLOCKED, apply cannot proceed; if ⚠️ CONDITIONAL, user must acknowledge; if ✅ PASS, proceed
6. **Oracle invocation** (tasks, mandatory) — gap analysis on task list before generation; Oracle 按信源优先级（proposal.md > design.md > specs）分析冲突并给出修复建议，自动修复后循环调用直至仅剩用户判断项
7. **Oracle invocation** (critic, mandatory) — spec validation fix guidance; 如果 Oracle 调用失败则由 AI 自行修复格式问题
8. **Plan structure validation** (after generation, mandatory) — 4 grep checks verify sections exist and checkbox counts
   match
9. **Momus review** (optional) — post-generation review loop with OKAY/REJECT

## Language support

Schema uses `__LANG_PLACEHOLDER__` markers in all 5 instructions. The `sync-schemas.sh` script replaces them:

```bash
scripts/sync-schemas.sh --lang zh    # 中文: "所有生成的文档必须使用中文"
scripts/sync-schemas.sh --lang en    # English: "MUST be written in English"
scripts/sync-schemas.sh              # No preference: remove placeholders
```

The sync script uses `rm -rf + cp -R` (not `cp -R dir/ dest/` alone, which has macOS directory overwrite quirks).
Arithmetic uses `$((var + 1))` syntax (not `((var++))`) to avoid `set -e` exit on zero.

## Apply phase sync protocol

`apply.instruction` has a Task State Sync Protocol:

- **EAGER SYNC**: checkbox changes in `tasks.md` immediately mirrored to plan file
- **ON PAUSE / ON ALL_DONE**: `diff <(grep ... tasks.md) <(sed -n '/^## Tasks/,/^## /p' plan.md | grep ...)` verifies
  consistency
- `diff` is scoped to `## Tasks` section only (excludes FVW/Success Criteria checkboxes)

## Spec validation rules

`schema.yaml` specs.instruction includes `openspec validate` rules:

- Requirement must contain uppercase `MUST` or `SHALL` (Chinese "必须" fails)
- Scenario uses exactly 4 `#` (`#### Scenario:`)
- Each requirement ≥1 scenario with WHEN/THEN
- AI is instructed to run `openspec validate <change-name>` after writing specs

## Constitution Schema

A standalone `constitution` schema is available alongside the default `spec-driven` schema. It provides a standardized workflow for project constitution initialization and updates.

**Purpose**: Manage project-level metadata — tech stack, coding standards, architecture constraints, and testing conventions — that exist independently of individual changes.

**Artifact chain** (5 steps):

```
scan → design → tasks → critic → apply
```

- **scan**: Tech stack analysis with 4-phase process (config detection → user conversation → 3~5 parallel librarian agents → summary). Handles both existing projects (analyze current stack) and empty projects (recommend stack).
- **design**: Multi-agent research for best practices per technology, `/summarize-research` to generate reference docs, optional code sync question.
- **tasks**: Simple checkbox list (2 base tasks: update AGENTS.md + create skill files; 1 optional: fix violations).
- **critic**: 5 parallel Momus reviews + quality gates (frontmatter, AGENTS.md section, references integrity). Reuses spec-driven's critic mechanism with adaptations.
- **apply**: Writes AGENTS.md (`## Constitution` section) + `.opencode/skills/constitution/` (SKILL.md + references). Init/update/incomplete detection via fixed file paths.

**Output**: `.opencode/skills/constitution/SKILL.md` with YAML frontmatter + references/ organized by domain.

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
