#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_SCHEMAS="${REPO_DIR}/schemas"
LOCAL_SCHEMAS="${HOME}/.local/share/openspec/schemas"

LANG_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang)
      LANG_ARG="$2"
      shift 2
      ;;
    *)
      echo "使用方法: $0 [--lang zh|en]"
      echo ""
      echo "参数:"
      echo "  --lang zh  替换语言占位符为中文提示"
      echo "  --lang en  替换语言占位符为英文提示"
      echo "  无参数     删除所有语言占位符（不做语言偏好处理）"
      exit 1
      ;;
  esac
done

if [ "$LANG_ARG" != "" ] && [ "$LANG_ARG" != "zh" ] && [ "$LANG_ARG" != "en" ]; then
  echo "❌ 不支持的语言: $LANG_ARG（仅支持 zh 或 en）"
  exit 1
fi

if [ ! -d "$REPO_SCHEMAS" ]; then
  echo "❌ 未找到 schemas 目录: $REPO_SCHEMAS"
  exit 1
fi

mkdir -p "$LOCAL_SCHEMAS"

echo "📦 同步 schemas 到: $LOCAL_SCHEMAS"
echo ""

copied=0
updated=0

for item in "$REPO_SCHEMAS"/*/; do
  [ -d "$item" ] || continue

  schema_name="$(basename "$item")"
  target="${LOCAL_SCHEMAS}/${schema_name}"

  if [ -d "$target" ]; then
    cp -R "$item" "$LOCAL_SCHEMAS/"
    echo "  🔄 更新: ${schema_name}"
    ((updated++))
  else
    cp -R "$item" "$LOCAL_SCHEMAS/"
    echo "  ➕ 新增: ${schema_name}"
    ((copied++))
  fi
done

echo ""
echo "✅ 同步完成！新增: ${copied}, 更新: ${updated}"

process_placeholders() {
  local schema_dir="$1"
  find "$schema_dir" -name "schema.yaml" | while read -r file; do
    case "$LANG_ARG" in
      zh)
        sed -i '' 's/__LANG_PLACEHOLDER__/**语言**: 所有生成的文档必须使用中文。/' "$file"
        echo "  🌐 处理: $(basename "$(dirname "$file")") → 中文"
        ;;
      en)
        sed -i '' 's/__LANG_PLACEHOLDER__/**Language**: All generated documents MUST be written in English./' "$file"
        echo "  🌐 处理: $(basename "$(dirname "$file")") → English"
        ;;
      *)
        sed -i '' '/__LANG_PLACEHOLDER__/d' "$file"
        echo "  🔧 处理: $(basename "$(dirname "$file")") → 删除占位符（无语言偏好）"
        ;;
    esac
  done
}

if [ -d "$LOCAL_SCHEMAS" ]; then
  echo ""
  echo "🔤 处理语言占位符..."
  process_placeholders "$LOCAL_SCHEMAS"
  echo "✅ 语言处理完成！"
fi
