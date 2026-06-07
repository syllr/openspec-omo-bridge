#!/usr/bin/env bash
#
# sync.sh — 统一同步脚本
#
# 用途：把仓库内的 schemas / skills 同步到 OpenCode/OpenSpec 全局目录
# 模式：单向同步（仓库 → 全局），可重入
#
# 用法：
#   scripts/sync.sh                      # 同步全部（schemas + skills）
#   scripts/sync.sh --schemas-only       # 只同步 schemas
#   scripts/sync.sh --skills-only        # 只同步 skills
#   scripts/sync.sh --lang zh            # schemas 语言占位符替换为中文
#   scripts/sync.sh --lang en            # schemas 语言占位符替换为英文
#   scripts/sync.sh --dry-run             # 只显示会复制哪些文件，不实际执行
#   scripts/sync.sh --help                # 显示帮助

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_SCHEMAS_DIR="${REPO_DIR}/schemas"
REPO_SKILLS_DIR="${REPO_DIR}/skills"
OPENSPEC_SCHEMAS_DIR="${HOME}/.local/share/openspec/schemas"
OPENCODE_SKILLS_DIR="${HOME}/.config/opencode/skills"

DRY_RUN=false
SYNC_SCHEMAS=true
SYNC_SKILLS=true
LANG_ARG=""

usage() {
  cat <<EOF
用法：scripts/sync.sh [选项]

默认同步全部（schemas + skills）。可用选项：

  --schemas-only        只同步 schemas
  --skills-only         只同步 skills
  --lang <zh|en>        schemas 语言占位符处理（zh=中文, en=英文, 默认=删除占位符）
  --dry-run, -n         只显示会复制哪些文件，不实际执行
  --help, -h            显示帮助信息
EOF
}

# 解析参数
while [[ $# -gt 0 ]]; do
  case "$1" in
      --schemas-only)
        SYNC_SKILLS=false
        shift
        ;;
      --skills-only)
        SYNC_SCHEMAS=false
        shift
        ;;
    --lang)
      if [[ -z "${2:-}" || ! "$2" =~ ^(zh|en)$ ]]; then
        echo "❌ --lang 参数必须是 zh 或 en"
        echo ""
        usage
        exit 1
      fi
      LANG_ARG="$2"
      shift 2
      ;;
    --dry-run|-n)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "❌ 未知参数：$1"
      echo ""
      usage
      exit 1
      ;;
  esac
done

# ============================================================
# 同步 schemas
# ============================================================
sync_schemas() {
  if [[ ! -d "${REPO_SCHEMAS_DIR}" ]]; then
    echo "❌ schemas 目录不存在：${REPO_SCHEMAS_DIR}"
    return 1
  fi

  mkdir -p "${OPENSPEC_SCHEMAS_DIR}"

  echo ""
  echo "📋 schemas 同步"
  echo "  源：${REPO_SCHEMAS_DIR}"
  echo "  目标：${OPENSPEC_SCHEMAS_DIR}"
  echo ""

  local copied=0
  local updated=0

  for item in "${REPO_SCHEMAS_DIR}"/*/; do
    [ -d "$item" ] || continue
    local schema_name="$(basename "$item")"
    local target="${OPENSPEC_SCHEMAS_DIR}/${schema_name}"

    if [ -d "$target" ]; then
      rm -rf "$target"
      updated=$((updated + 1))
    else
      copied=$((copied + 1))
    fi
    cp -R "${item%/}" "${OPENSPEC_SCHEMAS_DIR}/"
  done

  echo "  ✅ 同步完成：新增 ${copied}，更新 ${updated}"
  echo ""

  # 处理语言占位符
  echo "  语言处理（${LANG_ARG:-无偏好}）："
  while IFS= read -r file; do
    local schema_name="$(basename "$(dirname "$file")")"
    case "${LANG_ARG}" in
      zh)
        sed -i '' 's/__LANG_PLACEHOLDER__/**语言**: 所有生成的文档必须使用中文。/g' "$file"
        echo "    ${schema_name}: 中文"
        ;;
      en)
        sed -i '' 's/__LANG_PLACEHOLDER__/**Language**: All generated documents MUST be written in English./g' "$file"
        echo "    ${schema_name}: English"
        ;;
      *)
        sed -i '' '/__LANG_PLACEHOLDER__/d' "$file"
        echo "    ${schema_name}: 删除占位符"
        ;;
    esac
  done < <(find "${OPENSPEC_SCHEMAS_DIR}" -name "schema.yaml" 2>/dev/null || true)
}

# ============================================================
# 同步 skills
# ============================================================
sync_skills() {
  if [[ ! -d "${REPO_SKILLS_DIR}" ]]; then
    echo "❌ skills 目录不存在：${REPO_SKILLS_DIR}"
    return 1
  fi

  mkdir -p "${OPENCODE_SKILLS_DIR}"

  echo ""
  echo "🎯 skills 同步"
  echo "  源：${REPO_SKILLS_DIR}"
  echo "  目标：${OPENCODE_SKILLS_DIR}"
  echo ""

  local copied=0
  local updated=0
  local found_any=false

  for item in "${REPO_SKILLS_DIR}"/*/; do
    [ -d "$item" ] || continue
    found_any=true
    local skill_name="$(basename "$item")"
    local target="${OPENCODE_SKILLS_DIR}/${skill_name}"

    if [[ "${DRY_RUN}" == true ]]; then
      if [ -d "$target" ]; then
        echo "    [DRY] ${skill_name} (update) → ${target}"
      else
        echo "    [DRY] ${skill_name} (new) → ${target}"
      fi
      copied=$((copied + 1))
      continue
    fi

    if [ -d "$target" ]; then
      rm -rf "$target"
      updated=$((updated + 1))
    else
      copied=$((copied + 1))
    fi
    cp -R "${item%/}" "${OPENCODE_SKILLS_DIR}/"
    echo "    ✓ ${skill_name}"
  done

  [[ "${found_any}" == false ]] && {
    echo "  ⚠️  未找到任何 skill 目录"
    return 0
  }

  echo ""
  if [[ "${DRY_RUN}" == true ]]; then
    echo "  🔍 DRY RUN：${copied} 个 skill 将被处理（未实际执行）"
  else
    echo "  ✅ skill 同步完成：${copied} 个目录处理（${updated} 更新）"
    echo ""
    echo "  ⚠️  重启 OpenCode 后生效。同步的 skill（按 frontmatter name）："
    for skill_dir in "${REPO_SKILLS_DIR}"/*/; do
      [ -d "$skill_dir" ] || continue
      [[ -f "${skill_dir}/SKILL.md" ]] || continue
      local skill_name
      skill_name=$(grep -E '^name:' "${skill_dir}/SKILL.md" 2>/dev/null | head -1 | sed -E 's/^name:\s*//' || true)
      [[ -n "${skill_name}" ]] && echo "    - ${skill_name}"
    done
  fi
}

# ============================================================
# 主流程
# ============================================================
[[ "${SYNC_SCHEMAS}" == true ]] && sync_schemas
[[ "${SYNC_SKILLS}" == true ]] && sync_skills
echo ""
echo "🎉 全部完成"
