#!/usr/bin/env bun
//
// gen-source-plan.ts — omo-spec source plan 骨架生成器
//
// 用法:
//   bun gen-source-plan.ts <change-name> [--schema <name>] [--lang <zh|en|auto>]
//
// 作用:
//   1. 读 schemas/<schema>/schema.yaml 解析 artifacts 列表
//   2. 读 schemas/<schema>/templates/ 拿到每个 artifact 的 markdown 模板
//   3. 读 omo-spec/templates/source-plan-<schema>.md 骨架模板
//   4. 处理 schema.yaml instruction 中的 __LANG_PLACEHOLDER__ 替换
//   5. 生成第 6/7/8 章内容(脚本自动填)
//   6. 输出到 .omo/plans/source-<change-name>.md
//
// 适用阶段: omo-spec-source-plan skill 调用一次,生成骨架后 LLM 填业务内容。
//
// 约束: 本脚本只读 schema.yaml / templates / source-plan-*.md,
//       只写 .omo/plans/source-<change-name>.md。**不修改任何老文件。**
//

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ============================================================
// 类型定义
// ============================================================

export interface SchemaArtifact {
  id: string;
  generates: string;
  description: string;
  template: string;
  tracks: string;
  instruction: string;
  requires: string[];
}

export interface ParsedSchema {
  name: string;
  version: number;
  description: string;
  artifacts: SchemaArtifact[];
  apply: { requires: string[]; tracks: string; instruction: string };
}

export type LangMode = "zh" | "en" | "auto";

// ============================================================
// 纯函数(导出供测试 import)
// ============================================================

/**
 * 解析 schema.yaml 文本为结构化对象。
 * 使用 Bun.YAML.parse(无第三方依赖)。
 */
export function parseSchema(yamlContent: string): ParsedSchema {
  const data = Bun.YAML.parse(yamlContent) as any;
  if (!data || typeof data !== "object") {
    throw new Error("schema.yaml 解析失败:根对象为空或非对象");
  }
  if (!data.name || !Array.isArray(data.artifacts)) {
    throw new Error("schema.yaml 解析失败:缺少 name 或 artifacts 字段");
  }
  return {
    name: data.name,
    version: data.version ?? 1,
    description: data.description ?? "",
    artifacts: (data.artifacts as any[]).map((a) => ({
      id: a.id,
      generates: a.generates,
      description: a.description ?? "",
      template: a.template,
      tracks: a.tracks ?? "",
      instruction: a.instruction ?? "",
      requires: a.requires ?? [],
    })),
    apply: data.apply ?? { requires: [], tracks: "", instruction: "" },
  };
}

/**
 * 替换 schema.yaml instruction 字段里的 __LANG_PLACEHOLDER__。
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
 * 每个 artifact 一行,缩进 2 空格。
 */
export function generateTargetArtifactsYaml(artifacts: SchemaArtifact[]): string {
  return artifacts.map((a) => `  - ${a.generates}`).join("\n");
}

/**
 * 生成第 6 章的 Wave 块。
 * 每个 schema.artifacts 元素 → 1 个 ### 6.N Wave N 章节 + 1 个 task。
 * task 的 Embedded Reference 指向第 7/8 章(强制 LLM 读静态嵌入内容)。
 */
export function generateWavesBlock(artifacts: SchemaArtifact[]): string {
  return artifacts
    .map((artifact, idx) => {
      const waveNum = idx + 1;
      const taskNum = idx + 1;
      const outputPath = `openspec/changes/<change-name>/${artifact.generates}`;
      const isSpecsArtifact = artifact.id === "specs";

      return `### 6.${waveNum} Wave ${waveNum}: ${artifact.id}

#### ${taskNum}. [ ] 生成 ${artifact.id} artifact

- **What to do**:
  1. 读取对话上下文(最近 30 条消息或当前需求描述)
  2. 按第 7.${waveNum} 节嵌入的 \`${artifact.id}.instruction\` 行为约束执行
  3. 按第 8.${waveNum} 节嵌入的 \`${artifact.id} template\` 结构填字段
  ${isSpecsArtifact ? "4. **若 artifact.id = specs** —— 为 proposal 的每个 Capability 创建一个 spec 文件\n  5. 写入 OpenSpec artifact 文件" : "4. 写入 OpenSpec artifact 文件"}
- **Output Path**: \`${outputPath}\`${isSpecsArtifact ? "(每个 capability 一个文件)" : ""}
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
 * 每个 artifact 一节,instruction 用 markdown code fence 包裹。
 */
export function generateSchemasBlock(
  artifacts: SchemaArtifact[],
  lang: LangMode
): string {
  return artifacts
    .map((artifact, idx) => {
      const sectionNum = idx + 1;
      const processed = replaceLanguage(artifact.instruction.trim(), lang);
      return `### 7.${sectionNum} ${artifact.id}.instruction

<details>
<summary>展开 instruction 全文(schema.yaml 中 ${artifact.id} 的 instruction 字段,语言已处理)</summary>

\`\`\`markdown
${processed}
\`\`\`

</details>`;
    })
    .join("\n\n---\n\n");
}

/**
 * 生成第 8 章的 templates block(嵌入每个 artifact 的 template 文件全文)。
 * 用 markdown code fence 包裹,保留原始格式。
 */
export function generateTemplatesBlock(
  artifacts: SchemaArtifact[],
  templates: Map<string, string>
): string {
  return artifacts
    .map((artifact, idx) => {
      const sectionNum = idx + 1;
      const content = templates.get(artifact.template);
      const body =
        content !== undefined
          ? content.trim()
          : `<!-- template 文件不存在: ${artifact.template} -->`;
      return `### 8.${sectionNum} ${artifact.id} template (\`${artifact.template}\`)

\`\`\`markdown
${body}
\`\`\``;
    })
    .join("\n\n---\n\n");
}

/**
 * 组合所有占位符替换,生成最终 source plan markdown。
 * 残留占位符检测:替换后若仍有 {{XXX}} 则抛错(防 LLM 之前手动添加)。
 */
export function generateSourcePlan(opts: {
  schemaName: string;
  changeName: string;
  schema: ParsedSchema;
  templates: Map<string, string>;
  templateContent: string;
  lang?: LangMode;
}): string {
  const lang = opts.lang ?? "auto";
  const date = new Date().toISOString().split("T")[0];

  let result = opts.templateContent;
  result = result.replaceAll("{{SCHEMA_NAME}}", opts.schemaName);
  result = result.replaceAll("{{CHANGE_NAME}}", opts.changeName);
  result = result.replaceAll("{{DATE}}", date);
  result = result.replaceAll(
    "{{TARGET_ARTIFACTS_YAML}}",
    generateTargetArtifactsYaml(opts.schema.artifacts)
  );
  result = result.replaceAll("{{WAVES_BLOCK}}", generateWavesBlock(opts.schema.artifacts));
  result = result.replaceAll(
    "{{SCHEMAS_BLOCK}}",
    generateSchemasBlock(opts.schema.artifacts, lang)
  );
  result = result.replaceAll(
    "{{TEMPLATES_BLOCK}}",
    generateTemplatesBlock(opts.schema.artifacts, opts.templates)
  );

  // 残留占位符检测
  const remaining = result.match(/\{\{[A-Z_0-9]+\}\}/g);
  if (remaining) {
    throw new Error(`未替换的占位符残留: ${remaining.join(", ")}`);
  }

  return result;
}

/**
 * 从 openspec/config.yaml 读 defaultSchema。失败时返回 null。
 */
export function readDefaultSchema(repoRoot: string): string | null {
  const configPath = join(repoRoot, "openspec", "config.yaml");
  if (!existsSync(configPath)) return null;
  try {
    const config = Bun.YAML.parse(readFileSync(configPath, "utf8")) as any;
    return config?.schema ?? null;
  } catch {
    return null;
  }
}

// ============================================================
// CLI 入口
// ============================================================

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`用法: gen-source-plan.ts <change-name> [--schema <name>] [--lang <zh|en|auto>]

选项:
  --schema <name>        指定 schema 名(默认从 openspec/config.yaml 读 defaultSchema)
  --lang <zh|en|auto>    语言处理(默认 auto=删除占位符,zh=中文提示,en=英文提示)
  --help, -h             显示帮助

环境变量:
  OPENSPEC_LANG          等同于 --lang,优先级低于 --lang

输出: .omo/plans/source-<change-name>.md(LLM 填充第 1-5/9 章后跑 /start-work 实施)`);
    process.exit(0);
  }

  const changeName = args[0];
  let schemaName = "";
  let lang: LangMode = (process.env.OPENSPEC_LANG as LangMode) || "auto";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--schema") {
      schemaName = args[++i] ?? "";
    } else if (args[i] === "--lang") {
      const v = args[++i];
      if (v !== "zh" && v !== "en" && v !== "auto") {
        console.error(`❌ --lang 必须是 zh / en / auto,收到: ${v}`);
        process.exit(1);
      }
      lang = v;
    }
  }

  const repoRoot = process.cwd();

  // 推断 schema name
  if (!schemaName) {
    const inferred = readDefaultSchema(repoRoot);
    if (inferred) {
      schemaName = inferred;
    } else {
      console.error("❌ 未指定 --schema,且 openspec/config.yaml 读取失败或不含 schema 字段");
      console.error("   请显式传 --schema <name>");
      process.exit(1);
    }
  }

  // 读 schema.yaml
  const schemaPath = join(repoRoot, "schemas", schemaName, "schema.yaml");
  if (!existsSync(schemaPath)) {
    console.error(`❌ Schema 文件不存在: ${schemaPath}`);
    process.exit(1);
  }
  const schema = parseSchema(readFileSync(schemaPath, "utf8"));

  // 读 templates(去重,多个 artifact 可能引用同一 template)
  const templates = new Map<string, string>();
  for (const artifact of schema.artifacts) {
    if (templates.has(artifact.template)) continue;
    const tplPath = join(repoRoot, "schemas", schemaName, "templates", artifact.template);
    templates.set(
      artifact.template,
      existsSync(tplPath) ? readFileSync(tplPath, "utf8") : ""
    );
  }

  // 读 source plan 骨架模板
  const sourcePlanTplPath = join(
    repoRoot,
    "omo-spec",
    "templates",
    `source-plan-${schemaName}.md`
  );
  if (!existsSync(sourcePlanTplPath)) {
    console.error(`❌ Source plan 模板不存在: ${sourcePlanTplPath}`);
    console.error(`   已支持的 schema: spec-driven, constitution`);
    console.error(`   新增 schema 时,请在 omo-spec/templates/ 下加 source-plan-<name>.md`);
    process.exit(1);
  }
  const templateContent = readFileSync(sourcePlanTplPath, "utf8");

  // 生成
  let planContent: string;
  try {
    planContent = generateSourcePlan({
      schemaName,
      changeName,
      schema,
      templates,
      templateContent,
      lang,
    });
  } catch (err) {
    console.error(`❌ 生成失败: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // 写入
  const outputDir = join(repoRoot, ".omo", "plans");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = join(outputDir, `source-${changeName}.md`);
  writeFileSync(outputPath, planContent);

  console.log(`✅ Source plan 已生成: ${outputPath}`);
  console.log(`   Schema: ${schemaName}`);
  console.log(`   Artifacts: ${schema.artifacts.map((a) => a.id).join(", ")}`);
  console.log(`   Language: ${lang}`);
  console.log(``);
  console.log(`📝 下一步:`);
  console.log(`   1. Read ${outputPath}`);
  console.log(`   2. LLM 填充第 1-5/9 章业务内容(<!-- LLM_FILL: ... --> 标记)`);
  console.log(`   3. 用户 review source plan`);
  console.log(`   4. 跑 /start-work source-${changeName} 实施`);
}
