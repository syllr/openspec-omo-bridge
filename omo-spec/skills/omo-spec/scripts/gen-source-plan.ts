#!/usr/bin/env bun
//
// gen-source-plan.ts — omo-spec source plan 骨架生成器
//
// 用法:
//   bun gen-source-plan.ts <change-name> --artifacts <list> [--lang <zh|en|auto>]
//
// 作用:
//   1. 读 omo-spec/artifacts/<name>/instruction.md + template.md
//   2. 读 omo-spec/templates/source-plan.md 骨架模板
//   3. 处理 instruction 中的 __LANG_PLACEHOLDER__ 替换
//   4. 生成第 6/7/8 章内容(脚本自动填)
//   5. 输出到 .omo/plans/source-<change-name>.md
//
// 适用阶段: omo-spec skill 调用一次,生成骨架后 LLM 填业务内容。
//
// 约束: 本脚本只读 omo-spec/artifacts/ / omo-spec/templates/,
//       只写 .omo/plans/source-<change-name>.md。**不修改任何老文件。**
//

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ============================================================
// 类型定义
// ============================================================

export interface ArtifactDef {
  id: string;
  instruction: string;
  template: string;
  requires: string[];
}

export type LangMode = "zh" | "en" | "auto";

// ============================================================
// 纯函数(导出供测试 import)
// ============================================================

/**
 * 从 instruction.md 头部解析 requires 字段。
 * 格式: requires: [artifact1, artifact2] 或 requires: []
 * 如果没有 requires 字段,返回空数组。
 */
export function parseRequires(instructionContent: string): string[] {
  const match = instructionContent.match(/^requires:\s*\[(.*)\]\s*$/m);
  if (!match) return [];
  const content = match[1]?.trim();
  if (!content) return [];
  return content.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * 从 omo-spec/artifacts/ 目录加载指定的 artifacts。
 * 每个 artifact 目录必须包含 instruction.md 和 template.md。
 * instruction.md 头部可选包含 requires: [...] 字段。
 */
export function loadArtifacts(repoRoot: string, artifactIds: string[]): ArtifactDef[] {
  const artifactsDir = join(repoRoot, "omo-spec", "artifacts");
  const result: ArtifactDef[] = [];

  for (const id of artifactIds) {
    const artifactDir = join(artifactsDir, id);
    if (!existsSync(artifactDir)) {
      throw new Error(`Artifact 目录不存在: ${artifactDir}`);
    }

    const instructionPath = join(artifactDir, "instruction.md");
    const templatePath = join(artifactDir, "template.md");

    if (!existsSync(instructionPath)) {
      throw new Error(`instruction.md 不存在: ${instructionPath}`);
    }
    if (!existsSync(templatePath)) {
      throw new Error(`template.md 不存在: ${templatePath}`);
    }

    const instructionContent = readFileSync(instructionPath, "utf8");
    const requires = parseRequires(instructionContent);

    // 去掉 requires 头部行,保留真正的 instruction 内容
    const instruction = instructionContent.replace(/^requires:.*\n/m, "");

    result.push({
      id,
      instruction,
      template: readFileSync(templatePath, "utf8"),
      requires,
    });
  }

  return result;
}

/**
 * 列出 omo-spec/artifacts/ 下所有可用的 artifact 及其 requires。
 */
export function listAvailableArtifactsWithRequires(repoRoot: string): ArtifactDef[] {
  const artifactsDir = join(repoRoot, "omo-spec", "artifacts");
  if (!existsSync(artifactsDir)) {
    return [];
  }
  const ids = readdirSync(artifactsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return loadArtifacts(repoRoot, ids);
}

/**
 * 获取下一轮可选的 artifacts。
 * 条件:所有 parent(在 requires 中)都已在 selectedIds 中。
 */
export function getNextSelectableArtifacts(
  allArtifacts: ArtifactDef[],
  selectedIds: string[]
): ArtifactDef[] {
  return allArtifacts.filter((a) => {
    // 已选中的跳过
    if (selectedIds.includes(a.id)) return false;
    // 所有 parent 都已选中
    return a.requires.every((req) => selectedIds.includes(req));
  });
}

/**
 * 列出 omo-spec/artifacts/ 下所有可用的 artifact ID。
 */
export function listAvailableArtifacts(repoRoot: string): string[] {
  const artifactsDir = join(repoRoot, "omo-spec", "artifacts");
  if (!existsSync(artifactsDir)) {
    return [];
  }
  return readdirSync(artifactsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * 替换 instruction 中的 __LANG_PLACEHOLDER__。
 *  - zh: 替换为 "**语言**: 所有生成的文档必须使用中文。"
 *  - en: 替换为 "**Language**: All generated documents MUST be written in English."
 *  - auto: 删除该行(默认)
 */
export function replaceLanguage(text: string, lang: LangMode = "auto"): string {
  const LANG_LINE = {
    zh: "**语言**: 所有生成的文档必须使用中文。",
    en: "**Language**: All generated documents MUST be written in English.",
  };

  if (lang === "zh") {
    return text.replaceAll("__LANG_PLACEHOLDER__", LANG_LINE.zh);
  }
  if (lang === "en") {
    return text.replaceAll("__LANG_PLACEHOLDER__", LANG_LINE.en);
  }
  // auto: 删除占位符所在行
  return text
    .split(/\r\n|\r|\n/)
    .filter((line) => !line.includes("__LANG_PLACEHOLDER__"))
    .join("\n");
}

/**
 * 生成 targetArtifacts YAML 列表(用于 frontmatter)。
 */
export function generateTargetArtifactsYaml(artifactIds: string[]): string {
  return artifactIds.map((id) => `  - ${id}`).join("\n");
}

/**
 * 生成第 6 章的 Wave 块。
 * 每个 artifact → 1 个 ### 6.N Wave N 章节 + 1 个 task。
 */
export function generateWavesBlock(artifacts: ArtifactDef[]): string {
  return artifacts
    .map((artifact, idx) => {
      const waveNum = idx + 1;
      const taskNum = idx + 1;

      return `### 6.${waveNum} Wave ${waveNum}: ${artifact.id}

#### ${taskNum}. [ ] 生成 ${artifact.id} artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.${waveNum} 节嵌入的 \`${artifact.id}.instruction\` 行为约束执行
  3. 按第 8.${waveNum} 节嵌入的 \`${artifact.id} template\` 结构填字段
  4. 写入 OpenSpec artifact 文件
- **Output Path**: \`openspec/changes/<change-name>/${artifact.id}.md\`(或 \`specs/<capability>/spec.md\`)
- **Embedded Reference**: 第 7.${waveNum} 节(\`${artifact.id}.instruction\` 全文)+ 第 8.${waveNum} 节(\`${artifact.id} template\` 全文)
- **Acceptance Criteria**:
  - 文件存在
  - 包含模板必需 sections(详见第 8.${waveNum} 节)
  - \`openspec validate <change-name>\` 通过(若 schema 含 validate 步骤)
- **Forbidden**:
  - 写入 \`<context>\` / \`<rules>\` / \`<project_context>\` 字面量到 artifact 文件
  - 修改任何源代码(本阶段只生成 spec 文件)
- **Review Checkpoint**: 完成本 Wave 后停下,用 question 工具问用户是否继续
- **Agent Profile**: \`category="unspecified-low"\` (内容生成,非复杂逻辑)`;
    })
    .join("\n\n---\n\n");
}

/**
 * 生成第 7 章的 schema block(嵌入每个 artifact 的 instruction)。
 */
export function generateSchemasBlock(
  artifacts: ArtifactDef[],
  lang: LangMode
): string {
  return artifacts
    .map((artifact, idx) => {
      const sectionNum = idx + 1;
      const processed = replaceLanguage(artifact.instruction.trim(), lang);
      return `### 7.${sectionNum} ${artifact.id}.instruction

<details>
<summary>展开 instruction 全文(${artifact.id} 的 instruction,语言已处理)</summary>

\`\`\`markdown
${processed}
\`\`\`

</details>`;
    })
    .join("\n\n---\n\n");
}

/**
 * 生成第 8 章的 templates block(嵌入每个 artifact 的 template)。
 */
export function generateTemplatesBlock(artifacts: ArtifactDef[]): string {
  return artifacts
    .map((artifact, idx) => {
      const sectionNum = idx + 1;
      const content = artifact.template.trim();
      return `### 8.${sectionNum} ${artifact.id} template

\`\`\`markdown
${content}
\`\`\``;
    })
    .join("\n\n---\n\n");
}

/**
 * 组合所有占位符替换,生成最终 source plan markdown。
 */
export function generateSourcePlan(opts: {
  changeName: string;
  artifacts: ArtifactDef[];
  templateContent: string;
  lang?: LangMode;
}): string {
  const lang = opts.lang ?? "auto";
  const date = new Date().toISOString().split("T")[0];

  let result = opts.templateContent;
  result = result.replaceAll("{{CHANGE_NAME}}", opts.changeName);
  result = result.replaceAll("{{DATE}}", date);
  result = result.replaceAll(
    "{{TARGET_ARTIFACTS_YAML}}",
    generateTargetArtifactsYaml(opts.artifacts.map((a) => a.id))
  );
  result = result.replaceAll("{{WAVES_BLOCK}}", generateWavesBlock(opts.artifacts));
  result = result.replaceAll(
    "{{SCHEMAS_BLOCK}}",
    generateSchemasBlock(opts.artifacts, lang)
  );
  result = result.replaceAll(
    "{{TEMPLATES_BLOCK}}",
    generateTemplatesBlock(opts.artifacts)
  );

  // 残留占位符检测
  const remaining = result.match(/\{\{[A-Z_0-9]+\}\}/g);
  if (remaining) {
    throw new Error(`未替换的占位符残留: ${remaining.join(", ")}`);
  }

  return result;
}

// ============================================================
// CLI 入口
// ============================================================

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`用法: gen-source-plan.ts <change-name> --artifacts <list> [--lang <zh|en|auto>]

选项:
  --artifacts <list>     逗号分隔的 artifact ID(如 proposal,design,spec)
  --lang <zh|en|auto>    语言处理(默认 auto=删除占位符,zh=中文提示,en=英文提示)
  --help, -h             显示帮助

环境变量:
  OPENSPEC_LANG          等同于 --lang,优先级低于 --lang

示例:
  bun gen-source-plan.ts add-user-auth --artifacts proposal,design,spec
  bun gen-source-plan.ts refactor-auth --artifacts proposal,design --lang zh

输出: .omo/plans/source-<change-name>.md(LLM 填充第 1-5/9 章后跑 /start-work 实施)`);
    process.exit(0);
  }

  const changeName = args[0];
  let artifactIds: string[] = [];
  let lang: LangMode = (process.env.OPENSPEC_LANG as LangMode) || "auto";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--artifacts") {
      const list = args[++i];
      if (!list) {
        console.error("❌ --artifacts 参数不能为空");
        process.exit(1);
      }
      artifactIds = list.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (args[i] === "--lang") {
      const v = args[++i];
      if (v !== "zh" && v !== "en" && v !== "auto") {
        console.error(`❌ --lang 必须是 zh / en / auto,收到: ${v}`);
        process.exit(1);
      }
      lang = v;
    }
  }

  if (artifactIds.length === 0) {
    console.error("❌ 必须指定 --artifacts 参数(逗号分隔的 artifact ID)");
    console.error("   可用 artifacts: proposal, design, spec");
    process.exit(1);
  }

  const repoRoot = process.cwd();

  // 列出可用 artifacts
  const available = listAvailableArtifacts(repoRoot);
  if (available.length === 0) {
    console.error("❌ omo-spec/artifacts/ 目录为空或不存在");
    process.exit(1);
  }

  // 校验用户选的 artifacts 是否都存在
  for (const id of artifactIds) {
    if (!available.includes(id)) {
      console.error(`❌ Artifact '${id}' 不存在。可用: ${available.join(", ")}`);
      process.exit(1);
    }
  }

  // 加载 artifacts
  const artifacts = loadArtifacts(repoRoot, artifactIds);

  // 创建 spec/<change-name>/ 目录
  const specDir = join(repoRoot, "spec", changeName);
  if (!existsSync(specDir)) {
    mkdirSync(specDir, { recursive: true });
  }

  // 复制 template.md 文件到 spec/<change-name>/
  for (const artifact of artifacts) {
    const templatePath = join(repoRoot, "omo-spec", "artifacts", artifact.id, "template.md");
    const destPath = join(specDir, `${artifact.id}.md`);
    if (existsSync(templatePath)) {
      const content = readFileSync(templatePath, "utf8");
      writeFileSync(destPath, content);
    }
  }

  // 读 source plan 骨架模板
  const sourcePlanTplPath = join(repoRoot, "omo-spec", "templates", "source-plan.md");
  if (!existsSync(sourcePlanTplPath)) {
    console.error(`❌ Source plan 模板不存在: ${sourcePlanTplPath}`);
    process.exit(1);
  }
  const templateContent = readFileSync(sourcePlanTplPath, "utf8");

  // 生成
  let planContent: string;
  try {
    planContent = generateSourcePlan({
      changeName,
      artifacts,
      templateContent,
      lang,
    });
  } catch (err) {
    console.error(`❌ 生成失败: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // 写入 spec-source-<change-name>.md
  const planPath = join(repoRoot, `spec-source-${changeName}.md`);
  writeFileSync(planPath, planContent);

  console.log(`✅ Spec 目录已创建: ${specDir}`);
  console.log(`✅ Source plan 已生成: ${planPath}`);
  console.log(`   Artifacts: ${artifactIds.join(", ")}`);
  console.log(`   Language: ${lang}`);
  console.log(``);
  console.log(`📝 下一步:`);
  console.log(`   1. Read ${specDir}/ 目录中的模板文件`);
  console.log(`   2. Read ${planPath}`);
  console.log(`   3. LLM 填充第 1-5/9 章业务内容(<!-- LLM_FILL: ... --> 标记)`);
  console.log(`   4. 用户 review source plan`);
  console.log(`   5. 跑 /start-work spec-source-${changeName} 实施`);
}
