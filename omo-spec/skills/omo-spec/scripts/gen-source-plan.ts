#!/usr/bin/env bun
//
// gen-source-plan.ts — omo-spec source plan 骨架生成器
//
// 用法:
//   bun gen-source-plan.ts <change-name> --artifacts <list> [--lang <zh|en|auto>]
//
// 作用:
//   1. 读 omo-spec/artifacts/<name>/<id>.instruction + <id>.template(防 OMO 误扫,非 .md 后缀)
//   2. 读 omo-spec/templates/source-plan.template 骨架模板(也是 .template 后缀防 OMO 误扫)
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
 * 从 <id>.instruction 头部解析 requires 字段。
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
 * 每个 artifact 目录必须包含 <id>.instruction 和 <id>.template。
 * <id>.instruction 头部可选包含 requires: [...] 字段。
 */
export function loadArtifacts(repoRoot: string, artifactIds: string[]): ArtifactDef[] {
  const artifactsDir = join(repoRoot, "omo-spec", "artifacts");
  const result: ArtifactDef[] = [];

  for (const id of artifactIds) {
    const artifactDir = join(artifactsDir, id);
    if (!existsSync(artifactDir)) {
      throw new Error(`Artifact 目录不存在: ${artifactDir}`);
    }

    const instructionPath = join(artifactDir, `${id}.instruction`);
    const templatePath = join(artifactDir, `${id}.template`);

    if (!existsSync(instructionPath)) {
      throw new Error(`${id}.instruction 不存在: ${instructionPath}`);
    }
    if (!existsSync(templatePath)) {
      throw new Error(`${id}.template 不存在: ${templatePath}`);
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
export function generateWavesBlock(artifacts: ArtifactDef[], changeName: string): string {
  const targetPlanPath = `.omo/plans/${changeName}.md`;
  return `### Wave 1: 基础 artifacts

  - [ ] 1.1 生成 proposal

      **What to do**:
      1. 读取对话上下文(最近 30 条消息或当前需求描述)
      2. 按 \`omo-spec/artifacts/proposal/proposal.instruction\` 行为约束执行
      3. 按 \`omo-spec/artifacts/proposal/proposal.template\` 结构填字段
      4. 写入 \`spec/${changeName}/proposal.md\`

      **Must NOT do**:
      - 写入 \`<context>\` / \`<rules>\` / \`<project_context>\` 字面量
      - 修改任何源代码

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - omo-spec/artifacts/proposal/proposal.instruction
      - omo-spec/artifacts/proposal/proposal.template

      **Acceptance Criteria**:
      \`\`\`bash
      test -f spec/${changeName}/proposal.md
      \`\`\`

      **QA Scenarios**:
      Scenario: 结构完整 / Steps: grep "## Why\\|## What Changes\\|## Capabilities\\|## Impact" / Expected: 4 个 section 齐全

  - [ ] 1.2 生成 design

      **What to do**:
      1. 读取 \`spec/${changeName}/proposal.md\`(Wave 1 产物)作为输入
      2. 按 \`omo-spec/artifacts/design/design.instruction\` 行为约束执行
      3. 按 \`omo-spec/artifacts/design/design.template\` 结构填字段
      4. 写入 \`spec/${changeName}/design.md\`

      **Must NOT do**:
      - 写入 \`<context>\` / \`<rules>\` / \`<project_context>\` 字面量
      - 修改任何源代码

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - spec/${changeName}/proposal.md
      - omo-spec/artifacts/design/design.instruction
      - omo-spec/artifacts/design/design.template

      **Acceptance Criteria**:
      \`\`\`bash
      test -f spec/${changeName}/design.md
      \`\`\`

      **QA Scenarios**:
      Scenario: 结构完整 / Steps: grep "## Context\\|## Goals\\|## Decisions\\|## Risks" / Expected: 4 个 section 齐全

### Wave 2: spec + target-plan

  - [ ] 2.1 生成 spec

      **What to do**:
      1. 读取 \`spec/${changeName}/proposal.md\` + \`spec/${changeName}/design.md\`(Wave 1 产物)作为输入
      2. 按 \`omo-spec/artifacts/spec/spec.instruction\` 行为约束执行
      3. 按 \`omo-spec/artifacts/spec/spec.template\` 结构填字段
      4. 写入 \`spec/${changeName}/spec.md\`

      **Must NOT do**:
      - 写入 \`<context>\` / \`<rules>\` / \`<project_context>\` 字面量
      - 修改任何源代码

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - spec/${changeName}/proposal.md
      - spec/${changeName}/design.md
      - omo-spec/artifacts/spec/spec.instruction
      - omo-spec/artifacts/spec/spec.template

      **Acceptance Criteria**:
      \`\`\`bash
      test -f spec/${changeName}/spec.md
      openspec validate ${changeName}
      \`\`\`

      **QA Scenarios**:
      Scenario: validate 通过 / Steps: openspec validate ${changeName} / Expected: 返回 OK

  - [ ] 2.2 生成 target-plan

      **What to do**:
      1. 读取 \`spec/${changeName}/proposal.md\` + \`spec/${changeName}/design.md\` + \`spec/${changeName}/spec.md\`(Wave 1+2.1 产物)作为输入
      2. 按本 source plan(\`spec-source-${changeName}.md\`)中 \`## 1. TL;DR\` \`## 2. Context\` \`## 3. Work Objectives\` \`## 4. Verification Strategy\` \`## 5. Execution Strategy\` \`## 7. Final Verification Wave\` \`## 8. Commit Strategy\` \`## 9. Success Criteria\` 9 个章节的 TODO 占位符,翻译成 target-plan
      3. 写入 \`${targetPlanPath}\`

      **Must NOT do**:
      - 修改 source plan(\`spec-source-${changeName}.md\`)
      - 修改任何源代码

      **Recommended Agent Profile**: category="unspecified-low", load_skills=[]

      **References**:
      - spec-source-${changeName}.md(本文件)
      - spec/${changeName}/proposal.md
      - spec/${changeName}/design.md
      - spec/${changeName}/spec.md

      **Acceptance Criteria**:
      \`\`\`bash
      test -f ${targetPlanPath}
      grep -c "## Tasks" ${targetPlanPath}  # 必须有 ## Tasks 章节
      \`\`\`

      **QA Scenarios**:
      Scenario: target-plan 结构正确 / Steps: 9 个 OMO 章节齐全 / Expected: TL;DR/Context/Work Objectives/Verification/Execution/Tasks/Final Verification Wave/Commit Strategy/Success Criteria`;
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
 * 生成 TL;DR 默认骨架。
 */
export function generateTldrBlock(_artifacts: ArtifactDef[]): string {
  return `<TODO: 1-3 句话概述本次变更 —— 做什么、为什么做、影响范围。
参考格式:"将 X 从 A 改为 B,目的是 C,影响 D。">`;
}

/**
 * 生成 Context 默认骨架。
 */
export function generateContextBlock(_artifacts: ArtifactDef[]): string {
  return `<TODO: 2-5 句话说明背景 —— 当前系统状态、为什么需要这次变更、相关的技术债务或业务需求。>`;
}

/**
 * 生成 Work Objectives 默认骨架。
 */
export function generateWorkObjectivesBlock(artifacts: ArtifactDef[]): string {
  const artifactList = artifacts.map((a) => `- **${a.id}**: <TODO: 此 artifact 的目标>`).join("\n");
  return `<TODO: 明确本次变更的范围边界。Must Have 列出必须完成的事项,Must NOT Have 列出明确不做的事项。>

**Must Have**:
${artifactList}
- <TODO: 补充其他必须达成的目标>

**Must NOT Have**:
- <TODO: 列出明确不做的事项>`;
}

/**
 * 生成 Verification Strategy 默认骨架。
 */
export function generateVerificationBlock(artifacts: ArtifactDef[], changeName: string): string {
  const checks = artifacts
    .map((a) => `- <TODO: 验证 ${a.id} 的内容质量>`)
    .join("\n");
  return `<TODO: 如何验证 artifacts 生成正确。覆盖:结构完整性、内容质量、跨 artifact 一致性。>

每个 spec requirement 有对应的 scenario 作为验收标准：
${checks}

> \`openspec validate ${changeName}\` 通过(specs 阶段后)`;
}

/**
 * 生成 Execution Strategy 默认骨架。
 */
export function generateExecutionBlock(artifacts: ArtifactDef[]): string {
  const criticalPath = artifacts.map((a) => a.id).join(" → ");
  return `<TODO: 关键路径、并发约束、顺序依赖、风险点。>

核心设计决策来自 design.md:
- <TODO: Decision 1>
- <TODO: Decision 2>

**Critical Path**: ${criticalPath}
**Max Concurrent**: 1(artifacts 之间存在硬依赖)

任何 task 失败 → 立即停止(Fast Fail)。`;
}

/**
 * 生成 FVW 默认骨架。
 */
export function generateFvwBlock(artifacts: ArtifactDef[]): string {
  const fvwItems = artifacts
    .map((a, idx) => {
      const fNum = idx + 1;
      return `- [ ] F${fNum}. **${a.id} 验证** — <TODO: 验证 ${a.id} 的内容质量>`;
    })
    .join("\n");
  return `${fvwItems}
- [ ] F${artifacts.length + 1}. **omo-spec 工作流验证** — <TODO: 验证老 skill 0 diff,产物与 1.0 一致>`;
}

/**
 * 生成 Commit Strategy 默认骨架。
 */
export function generateCommitStrategyBlock(artifacts: ArtifactDef[]): string {
  const commits = artifacts
    .map((a) => `- <TODO: Wave ${artifacts.indexOf(a) + 1} (${a.id}) 的 commit message,如 \`feat(spec): add user-auth ${a.id}\`>`)
    .join("\n");
  return `<TODO: commit 策略。每个 artifact 一个 commit,Conventional Commits 格式。>

${commits}`;
}

/**
 * 生成 Success Criteria 默认骨架。
 */
export function generateSuccessCriteriaBlock(artifacts: ArtifactDef[], changeName: string): string {
  const criteria = artifacts
    .map((a) => `- [ ] \`spec/${changeName}/${a.id}.md\` 生成且通过结构验证(F${artifacts.indexOf(a) + 1})`)
    .join("\n");
  return `<TODO: 成功标准 —— 所有条件满足才算完成。用 checkbox 列表。应与 FVW 验证项对应。>

${criteria}
- [ ] 所有 artifact 模板 HTML 注释不残留
- [ ] omo-spec 工作流自身未污染老仓库`;
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

  let result = opts.templateContent;
  result = result.replaceAll("{{CHANGE_NAME}}", opts.changeName);
  result = result.replaceAll("{{TLDR}}", generateTldrBlock(opts.artifacts));
  result = result.replaceAll("{{CONTEXT}}", generateContextBlock(opts.artifacts));
  result = result.replaceAll(
    "{{WORK_OBJECTIVES}}",
    generateWorkObjectivesBlock(opts.artifacts)
  );
  result = result.replaceAll(
    "{{VERIFICATION_STRATEGY}}",
    generateVerificationBlock(opts.artifacts, opts.changeName)
  );
  result = result.replaceAll(
    "{{EXECUTION_STRATEGY}}",
    generateExecutionBlock(opts.artifacts)
  );
  result = result.replaceAll("{{WAVES_BLOCK}}", generateWavesBlock(opts.artifacts, opts.changeName));
  result = result.replaceAll("{{FVW_BLOCK}}", generateFvwBlock(opts.artifacts));
  result = result.replaceAll(
    "{{COMMIT_STRATEGY}}",
    generateCommitStrategyBlock(opts.artifacts)
  );
  result = result.replaceAll(
    "{{SUCCESS_CRITERIA}}",
    generateSuccessCriteriaBlock(opts.artifacts, opts.changeName)
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

  // 复制 <id>.template 文件到 spec/<change-name>/<id>.md
  // 注: artifacts/ 下的模板是 <id>.template 命名 + .template 后缀(防 OMO 误扫),复制到 spec/ 时改回 .md(因为是 LLM 输出的最终产物)
  for (const artifact of artifacts) {
    const templatePath = join(repoRoot, "omo-spec", "artifacts", artifact.id, `${artifact.id}.template`);
    const destPath = join(specDir, `${artifact.id}.md`);
    if (existsSync(templatePath)) {
      const content = readFileSync(templatePath, "utf8");
      writeFileSync(destPath, content);
    }
  }

  // 读 source plan 骨架模板
  const sourcePlanTplPath = join(repoRoot, "omo-spec", "templates", "source-plan.template");
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
  console.log(`   3. LLM 替换 <TODO: ...> 占位符为实际业务内容`);
  console.log(`   4. 用户 review source plan`);
  console.log(`   5. 跑 /start-work spec-source-${changeName} 实施`);
}
