#!/usr/bin/env node
//
// sync-plan-to-tasks.mjs — 把 OMO plan 文件同步到 OpenSpec tasks.md
//
// 用法: scripts/sync-plan-to-tasks.mjs <change-name>
//
// 作用:
//   读 `<planningHome.root>/.omo/plans/<change-name>.md` 内容,加 OpenSpec
//   标准 tasks.md 头部和"Plan Reference"段,写入
//   `<changeRoot>/tasks.md`。
//
// 适用阶段: apply 阶段结束时(LLM 实施完 + Oracle 验证结束后)调一次。
// 不在实施中或 Oracle 验证中预防性/刷新式调——plan 是 source of truth,
// 没改就不必再同步。

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const changeName = process.argv[2];
if (!changeName) {
  console.error("❌ 用法: sync-plan-to-tasks.mjs <change-name>");
  process.exit(1);
}

function run(cmd) {
  try {
    return JSON.parse(execSync(cmd, { encoding: "utf8" }));
  } catch (err) {
    console.error(`❌ 命令失败: ${cmd}\n${err.message}`);
    process.exit(1);
  }
}

const status = run(`openspec status --change "${changeName}" --json`);

const planFile = join(status.planningHome?.root ?? "", ".omo", "plans", `${changeName}.md`);
const tasksFile = join(status.changeRoot, "tasks.md");

if (!existsSync(planFile)) {
  console.error(`❌ plan 文件不存在: ${planFile}`);
  process.exit(1);
}

const planContent = readFileSync(planFile, "utf-8");

const header = `## Tasks

> 本文件由 \`.omo/plans/${changeName}.md\` 镜像生成。
> 修改 plan 后重新运行 sync tool 即可更新。
> **不要手动编辑**——下次同步会被覆盖。

---

`;

const footer = `

---

## Plan Reference

This tasks.md was mirrored from: \`.omo/plans/${changeName}.md\`

To re-sync after plan changes, run the \`omo_spec_sync_tasks_from_plan\` tool.
`;

writeFileSync(tasksFile, header + planContent + footer);
console.log(`✅ ${tasksFile} 已同步`);
