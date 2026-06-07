#!/usr/bin/env node
//
// inspect-apply.mjs — 拉取 OpenSpec apply 阶段 dynamic instruction
//
// 用法: scripts/inspect-apply.mjs <change-name>
//
// 输出: 单 JSON object(已剔除 tasks 数组)
// 字段: schemaName, state, progress{total,complete,remaining}, contextFiles, instruction
//
// 为什么剔除 tasks 数组:
//   spec-driven schema 下 tasks 数组 ≠ 执行清单。
//   真正执行清单在 `.omo/plans/<name>.md` 的 `## 6. TODOs` 段,
//   由 `omo-apply-change` skill §3 的 `/start-work` 驱动。
//   tasks 数组仅作 OpenSpec 标准格式兼容,本脚本不输出。

import { execSync } from "node:child_process";

const changeName = process.argv[2];
if (!changeName) {
  console.error("❌ 用法: inspect-apply.mjs <change-name>");
  process.exit(1);
}

let data;
try {
  const raw = execSync(
    `openspec instructions apply --change "${changeName}" --json`,
    { encoding: "utf8" }
  );
  data = JSON.parse(raw);
} catch (err) {
  console.error("❌ openspec 调用失败:", err.message);
  process.exit(1);
}

const { schemaName, state, progress, contextFiles, instruction } = data;
const out = {
  schemaName,
  state,
  progress: {
    total: progress.total,
    complete: progress.complete,
    remaining: progress.total - progress.complete,
  },
  contextFiles,
  instruction,
};
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
