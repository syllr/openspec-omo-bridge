## TL;DR

{{TLDR}}

> See [proposal.md](spec/{{CHANGE_NAME}}/proposal.md)

## Context

{{CONTEXT}}

> See [proposal.md](spec/{{CHANGE_NAME}}/proposal.md)

## Work Objectives

{{WORK_OBJECTIVES}}

> See [spec.md#added-requirements](spec/{{CHANGE_NAME}}/spec.md)

## Verification Strategy

{{VERIFICATION_STRATEGY}}

> See [specs](spec/{{CHANGE_NAME}}/specs/)

## Execution Strategy

{{EXECUTION_STRATEGY}}

> See [design.md](spec/{{CHANGE_NAME}}/design.md)

## Tasks

{{WAVES_BLOCK}}

## Final Verification Wave

{{FVW_BLOCK}}

## Commit Strategy

{{COMMIT_STRATEGY}}

## Success Criteria

{{SUCCESS_CRITERIA}}

> See [spec.md#added-requirements](spec/{{CHANGE_NAME}}/spec.md)

<!-- Progress Tracking (Meta: sync protocol for task states) -->

- tasks.md is the single source of truth for checkbox states
- When updating a checkbox in tasks.md, immediately mirror the change in this plan's ## Tasks section
- On pause or all_done: sync checkbox states from tasks.md to this plan and update .sisyphus/boulder.json
- Do NOT use todowrite/todoread
