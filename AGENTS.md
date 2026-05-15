# openspec-omo-bridge

Custom OpenSpec `spec-driven` schema that bridges OpenSpec workflows with oh-my-openagent (OMO) plan execution.

## Repository purpose

This is a **configuration repository** — not a code project. It houses a customized OpenSpec schema at
`schemas/spec-driven/` that extends the standard spec-driven workflow to generate OMO-compatible `.sisyphus/plans/` plan
files during the `tasks` artifact phase.

## Key files

| Path                              | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `schemas/spec-driven/schema.yaml` | Schema definition. 5 artifacts: proposal → specs → design → tasks → apply |
| `schemas/spec-driven/templates/`  | 4 template files (proposal.md, spec.md, design.md, tasks.md)              |
| `scripts/sync-schemas.sh`         | Syncs repo schemas to `~/.local/share/openspec/schemas/`                  |
| `.opencode/opencode.json`         | OpenCode project config — allows external directory access                |

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

1. **Spec validation** (critic, mandatory) — runs `openspec validate`, if errors consult Metis for fix guidance
2. **Plan generation** (critic, after validation passes) — generates the 9-section plan
3. **Plan structure validation** (critic, mandatory) — 4 grep checks verify sections exist and checkbox counts match
4. **5 parallel Momus reviews** (critic, mandatory) — comprehensive review: spec compliance, plan quality, edge cases, execution feasibility, design alignment
5. **Critic verdict** (critic, hard block) — if 🔴 BLOCKED, apply cannot proceed; if ⚠️ CONDITIONAL, user must acknowledge; if ✅ PASS, proceed
6. **Metis invocation** (tasks, mandatory) — gap analysis on task list before generation
7. **Metis invocation** (step 2, mandatory) — gap analysis; falls back to "proceed without Metis" if unavailable
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
