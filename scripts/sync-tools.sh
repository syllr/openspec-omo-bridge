#!/usr/bin/env bash
#
# sync-tools.sh — 把 tools/*.ts 同步到 OpenCode 的全局 tools 目录
#
# 用途：让 OpenCode 在任意项目里都能调用 openspec-omo-bridge 提供的工具
# 模式：单向同步（tools/ → ~/.config/opencode/tools/）
# 可重入：每次运行都会重新覆盖
#
# 用法：
#   scripts/sync-tools.sh [--dry-run] [--help]

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_TOOLS_DIR="${REPO_DIR}/tools"
OPENCODE_TOOLS_DIR="${HOME}/.config/opencode/tools"

DRY_RUN=false

usage() {
  cat <<EOF
用法：scripts/sync-tools.sh [--dry-run] [--help]

把 tools/*.ts 同步到 ~/.config/opencode/tools/

选项：
  --dry-run, -n   只显示会复制哪些文件，不实际执行
  --help, -h      显示帮助信息
EOF
}

# 解析参数
for arg in "$@"; do
  case "${arg}" in
    --dry-run|-n)
      DRY_RUN=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "❌ 未知参数：${arg}"
      echo ""
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "${REPO_TOOLS_DIR}" ]]; then
  echo "❌ tools 目录不存在：${REPO_TOOLS_DIR}"
  exit 1
fi

mkdir -p "${OPENCODE_TOOLS_DIR}"

echo "同步目录：${REPO_TOOLS_DIR}"
echo "目标目录：${OPENCODE_TOOLS_DIR}"
echo ""

copied=0
found_any=false

# 让不匹配的 glob 展开为空，避免处理字面量 "*.ts"
shopt -s nullglob
tool_files=("${REPO_TOOLS_DIR}"/*.ts)
shopt -u nullglob

if [[ ${#tool_files[@]} -eq 0 ]]; then
  echo "⚠️  未找到任何 .ts 工具文件：${REPO_TOOLS_DIR}"
  exit 0
fi

for tool_file in "${tool_files[@]}"; do
  if [[ ! -f "${tool_file}" ]]; then
    continue
  fi

  filename="$(basename "${tool_file}")"
  found_any=true

  # 跳过非主入口文件（带 -core、-test、-helper 等后缀的）
  case "${filename}" in
    *-core.ts|*-test.ts|*-helper.ts|*-util.ts|*-types.ts)
        continue
        ;;
  esac

  target="${OPENCODE_TOOLS_DIR}/${filename}"

  if [[ "${DRY_RUN}" == true ]]; then
    echo "  [DRY] ${filename} → ${target}"
    copied=$((copied + 1))
    continue
  fi

  cp "${tool_file}" "${target}"
  echo "  ✓ ${filename} → ${target}"
  copied=$((copied + 1))
done

if [[ "${found_any}" == false ]]; then
  echo "⚠️  未找到任何可同步的 .ts 工具文件"
  exit 0
fi

echo ""
if [[ "${DRY_RUN}" == true ]]; then
  echo "🔍 DRY RUN 完成：${copied} 个文件将被复制（未实际执行）"
else
  echo "✅ 同步完成：${copied} 个工具已复制到 OpenCode"
  echo ""
  echo "重启 OpenCode 后生效。检测到的 tool 入口（按 OpenCode 命名规则 <filename>_<exportname>）："
  for tool_file in "${OPENCODE_TOOLS_DIR}"/*.ts; do
    if [[ ! -f "${tool_file}" ]]; then
      continue
    fi
    filename="$(basename "${tool_file}" .ts)"
    # OpenCode 命名规则：filename 中的 hyphen → underscore
    tool_prefix=$(echo "${filename}" | tr '-' '_')
    # 提取所有 export const X = tool( 格式
    exports=$(grep -oE '^export const [a-zA-Z_][a-zA-Z0-9_]*\s*=\s*tool\(' "${tool_file}" 2>/dev/null | sed -E 's/^export const ([a-zA-Z_][a-zA-Z0-9_]*).*/\1/' | tr '\n' ' ')
    if [[ -n "${exports}" ]]; then
      for exp in ${exports}; do
        echo "  - ${tool_prefix}_${exp}"
      done
    else
      # 单 tool 模式：export default
      echo "  - ${tool_prefix}（export default）"
    fi
  done
fi
