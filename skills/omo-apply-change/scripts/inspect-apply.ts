#!/usr/bin/env node
//
// inspect-apply.ts — 拉取 OpenSpec apply 阶段 change 上下文
//
// 用法: scripts/inspect-apply.ts <change-name>
//
// 输出: 单 JSON object,8 字段精简版:
//   changeName, schemaName, planningHome, changeRoot,
//   contextFiles, planFile, planName, instruction
//
// 合并两个 OpenSpec CLI 调用:
//   - openspec status --change <name> --json
//   - openspec instructions apply --change <name> --json  (取 instruction)
//
// 剔除:
//   - `openspec instructions apply` 返回的 `tasks` 数组(OMO 用 plan 驱动实施,不需要此数组)

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";

const changeName = process.argv[2];
if (!changeName) {
  console.error("❌ 用法: inspect-apply.ts <change-name>");
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
const apply = run(`openspec instructions apply --change "${changeName}" --json`);

delete apply.tasks;

const schemaName = status.planningHome?.defaultSchema;

const contextFiles = {};
for (const [id, info] of Object.entries(status.artifactPaths ?? {})) {
  if (id === "tasks") continue;
  contextFiles[id] = info.existingOutputPaths;
}

const root = status.planningHome?.root;
const planFile = root && existsSync(join(root, ".omo", "plans", `${changeName}.md`))
  ? join(root, ".omo", "plans", `${changeName}.md`)
  : "";
// planName:basename(planFile, ".md"),专供 OMO `/start-work` 命令 args 用。
// OMO 的 findPlanByName 用 basename 去 .md 后严格匹配,传路径会匹配失败。
const planName = planFile ? basename(planFile, ".md") : "";

const out = {
  changeName: status.changeName,
  schemaName,
  planningHome: status.planningHome,
  changeRoot: status.changeRoot,
  contextFiles,
  planFile,
  planName,
  instruction: apply.instruction,
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
