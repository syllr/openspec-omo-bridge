#!/usr/bin/env bun
//
// sync-plan-to-tasks.ts — 把 OMO plan 文件同步到 OpenSpec tasks.md
//
// 用法: scripts/sync-plan-to-tasks.ts <change-name>
//
// 作用:
//   读 `<planningHome.root>/.omo/plans/<change-name>.md`,解析为结构化
//   OmoPlan,再生成 OpenSpec 标准 tasks.md 格式,写入 `<changeRoot>/tasks.md`。
//
// 适用阶段: apply 阶段结束时(LLM 实施完 + Oracle 验证结束后)调一次。
// 不在实施中或 Oracle 验证中预防性/刷新式调——plan 是 source of truth,
// 没改就不必再同步。
//
// 代码迁移说明:本文件包含从 tools/omo-spec.ts 复制的 parseOmoPlan /
// generateOpenSpecTasks 纯函数。后续 omo-spec.ts 会被删除,此副本是
// 同步脚本的单一来源。

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

// ============================================================
// 内嵌纯函数（从 tools/omo-spec.ts 复制，跨 schema 通用）
// ============================================================

const CORE_SECTION_TITLES = ["TODOs", "Final Verification Wave"];

function isCoreSection(title) {
  return CORE_SECTION_TITLES.some(
    (core) => title.toLowerCase() === core.toLowerCase()
  );
}

function stripSectionNumber(rawTitle) {
  return rawTitle.replace(/^\d+\.?\s*/, "").trim();
}

/**
 * 解析 OMO plan markdown 为结构化对象。支持 \r\n / \n / \r 行尾。
 * @param {string} content plan 文件的 markdown 原文
 * @param {string} changeName OpenSpec change 名称
 * @returns {{ changeName: string, sections: any[], tasks: any[], successCriteria: any[] }}
 */
export function parseOmoPlan(content, changeName) {
  if (!content) {
    return { changeName, sections: [], tasks: [], successCriteria: [] };
  }
  const lines = content.split(/\r\n|\r|\n/);
  const sections = [];
  const tasks = [];
  const successCriteria = [];

  let currentSection = null;
  let currentWave = "";
  let currentTask = null;
  let currentField = null;
  let currentIsCore = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      if (currentSection) sections.push(currentSection);
      const rawTitle = sectionMatch[1].trim();
      const title = stripSectionNumber(rawTitle);
      currentIsCore = isCoreSection(title);
      currentSection = { title, rawTitle, body: "", isCore: currentIsCore };
      currentTask = null;
      currentField = null;
      currentWave = "";
      continue;
    }

    if (!currentSection) continue;

    if (currentSection.title.toLowerCase() === "success criteria") {
      const scMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
      if (scMatch) {
        successCriteria.push({
          index: successCriteria.length + 1,
          text: scMatch[2].trim(),
          completed: scMatch[1].toLowerCase() === "x",
        });
        continue;
      }
      currentSection.body += line + "\n";
      continue;
    }

    if (!currentIsCore) {
      currentSection.body += line + "\n";
      continue;
    }

    const waveMatch = line.match(
      /^###\s+(?:\d+(?:\.\d+)*\s+)?Wave\s+(\d+)[:：]\s*(.*)$/
    );
    if (waveMatch && currentSection.title.toLowerCase() === "todos") {
      currentWave = `Wave ${waveMatch[1]}: ${waveMatch[2].trim()}`.trim();
      currentTask = null;
      currentField = null;
      continue;
    }

    const fvwTaskMatch = line.match(
      /^###\s+([fF]\d+)\.\s*\[\s*([ xX])\s*\]\s*(.+)$/
    );
    if (
      currentSection.title.toLowerCase() === "final verification wave" &&
      fvwTaskMatch
    ) {
      currentTask = {
        number: fvwTaskMatch[1],
        title: fvwTaskMatch[3].trim(),
        completed: fvwTaskMatch[2].trim().toLowerCase() === "x",
        wave: "Final Verification Wave",
        isFvw: true,
        fields: [],
      };
      tasks.push(currentTask);
      currentField = null;
      continue;
    }

    const todoTaskMatch = line.match(
      /^####\s+(\d+)\.\s*\[\s*([ xX])\s*\]\s*(.+)$/
    );
    if (currentSection.title.toLowerCase() === "todos" && todoTaskMatch) {
      const completed = todoTaskMatch[2].trim().toLowerCase() === "x";
      currentTask = {
        number: todoTaskMatch[1],
        title: todoTaskMatch[3].trim(),
        completed,
        wave: currentWave,
        isFvw: false,
        fields: [],
      };
      tasks.push(currentTask);
      currentField = null;
      continue;
    }

    const fieldMatch = line.match(/^-\s+\*\*([^*]+)\*\*:\s*(.*)$/);
    if (currentTask && fieldMatch) {
      const fieldName = fieldMatch[1].trim();
      if (fieldName === "") {
        currentField = null;
        continue;
      }
      currentField = {
        name: fieldName,
        value: fieldMatch[2],
      };
      currentTask.fields.push(currentField);
      continue;
    }

    if (
      currentField &&
      /^\s+\S/.test(line) &&
      !/^####|###|##/.test(line)
    ) {
      currentField.value += "\n" + line.trim();
      continue;
    }

    currentSection.body += line + "\n";
  }

  if (currentSection) sections.push(currentSection);

  return { changeName, sections, tasks, successCriteria };
}

/**
 * 从 OmoPlan 生成 OpenSpec tasks.md markdown。
 * 主体 = Wave 任务列表 + Final Verification Wave
 * Plan Reference = 元数据章节（1/2/3/4/5/8）
 * Success Criteria 不写入
 * @param {{ changeName: string, sections: any[], tasks: any[] }} plan
 * @returns {string} tasks.md 完整 markdown
 */
export function generateOpenSpecTasks(plan) {
  const lines = [];

  lines.push("## Tasks");
  lines.push("");
  lines.push("> 本文件由 `.omo/plans/<change-name>.md` 镜像生成。");
  lines.push("> 修改 plan 后重新运行同步 tool 即可更新。");
  lines.push("> **不要手动编辑**——下次同步会被覆盖。");
  lines.push("");
  lines.push("---");
  lines.push("");

  const waveGroups = new Map();
  for (const task of plan.tasks) {
    if (!waveGroups.has(task.wave)) waveGroups.set(task.wave, []);
    waveGroups.get(task.wave).push(task);
  }

  let waveIndex = 0;
  for (const [wave, tasks] of waveGroups) {
    waveIndex++;
    const waveLabel = wave.trim() || "Unassigned";
    lines.push(`### ${waveLabel}`);
    lines.push("");

    let subCounter = 0;
    for (const task of tasks) {
      subCounter++;
      const taskNumber = `${waveIndex}.${subCounter}`;

      if (task.isFvw) {
        lines.push(`- ${taskNumber} ${task.title}`);
      } else {
        const checkbox = task.completed ? "[x]" : "[ ]";
        lines.push(`- ${checkbox} ${taskNumber} ${task.title}`);
      }
      lines.push("");

      for (const field of task.fields) {
        const fieldValue = field.value.trim();
        if (fieldValue) {
          const indentedValue = fieldValue
            .split(/\r?\n/)
            .map((line, idx) => (idx === 0 ? line : `      ${line}`))
            .join("\n");
          lines.push(`      **${field.name}**: ${indentedValue}`);
          lines.push("");
        }
      }
    }
  }

  const referenceSections = plan.sections.filter((s) => !s.isCore);
  if (referenceSections.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Plan Reference");
    lines.push("");
    lines.push(
      "> 以下章节从 OMO plan 镜像，仅供人类阅读。OpenSpec CLI 不解析这些字段。"
    );
    lines.push("");

    for (const section of referenceSections) {
      if (!section.body.trim()) continue;

      lines.push(`### ${section.rawTitle}`);
      lines.push("");
      lines.push(section.body.trimEnd());
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ============================================================
// syncPlanToTasksFile
// ============================================================

export function syncPlanToTasksFile(
  planFilePath: string,
  changeRoot: string,
  changeName: string
): { tasksContent: string; tasksFile: string } {
  if (!planFilePath || !existsSync(planFilePath)) {
    throw new Error(`plan 文件不存在: ${planFilePath || "(path 为空)"}`);
  }
  if (!changeRoot) {
    throw new Error("changeRoot 为空,无法写入 tasks.md");
  }

  const planContent = readFileSync(planFilePath, "utf-8");
  const plan = parseOmoPlan(planContent, changeName);
  const tasksContent = generateOpenSpecTasks(plan);

  const tasksFile = join(changeRoot, "tasks.md");
  const tasksDir = dirname(tasksFile);
  if (!existsSync(tasksDir)) {
    mkdirSync(tasksDir, { recursive: true });
  }

  writeFileSync(tasksFile, tasksContent);
  return { tasksContent, tasksFile };
}

// ============================================================
// 主流程
// ============================================================

if (import.meta.main) {
  const changeName = process.argv[2];
  if (!changeName) {
    console.error("❌ 用法: sync-plan-to-tasks.ts <change-name>");
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

  const root = status.planningHome?.root;
  const planFile = root ? join(root, ".omo", "plans", `${changeName}.md`) : "";

  try {
    const { tasksFile } = syncPlanToTasksFile(planFile, status.changeRoot ?? "", changeName);
    console.log(`✅ ${tasksFile} 已同步`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}
