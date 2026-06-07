#!/usr/bin/env node
//
// inspect-apply.mjs — 拉取 OpenSpec apply 阶段 change 上下文
//
// 用法: scripts/inspect-apply.mjs <change-name>
//
// 输出: 单 JSON object,字段(精简到 6 个,其他冗余字段剔除):
//   changeName, schemaName, contextFiles, progress, state, instruction
//
// 合并两个 OpenSpec CLI 调用:
//   - openspec status --change <name> --json          (派生 schemaName + contextFiles)
//   - openspec instructions apply --change <name> --json  (取 progress, state, instruction)
//
// 剔除:
//   - OpenSpec `tasks` 数组(只来自 plan 的 ## 9. Success Criteria,≠ 执行清单,容易误导 LLM)
//   - status 的 artifacts / artifactPaths / actionContext / planningHome / isComplete / nextSteps / applyRequires(冗余或 LLM 实施时不需)

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const changeName = process.argv[2];
if (!changeName) {
  console.error("❌ 用法: inspect-apply.mjs <change-name>");
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
  contextFiles[id] = info.existingOutputPaths;
}

const planFilePath = join(status.planningHome?.root ?? "", ".omo", "plans", `${changeName}.md`);
const planFile = existsSync(planFilePath) ? planFilePath : "";

const out = {
  changeName: status.changeName,
  schemaName,
  planningHome: status.planningHome,
  changeRoot: status.changeRoot,
  contextFiles,
  planFile,
  instruction: apply.instruction,
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
