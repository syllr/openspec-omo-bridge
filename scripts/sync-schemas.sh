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
      exit 1
      ;;
  esac
done

if [ "$LANG_ARG" != "" ] && [ "$LANG_ARG" != "zh" ] && [ "$LANG_ARG" != "en" ]; then
  echo "错误: 不支持的语言 '$LANG_ARG'（仅支持 zh 或 en）"
  exit 1
fi

if [ ! -d "$REPO_SCHEMAS" ]; then
  echo "错误: 未找到 schemas 目录: $REPO_SCHEMAS"
  exit 1
fi

mkdir -p "$LOCAL_SCHEMAS"

echo "同步 schemas 到: $LOCAL_SCHEMAS"
echo ""

copied=0
updated=0

for item in "$REPO_SCHEMAS"/*/; do
  [ -d "$item" ] || continue
  schema_name="$(basename "$item")"
  target="${LOCAL_SCHEMAS}/${schema_name}"

  cp -R "$item" "$LOCAL_SCHEMAS/"
  if [ -d "$target" ]; then
    echo "  更新: ${schema_name}"
    ((updated++))
  else
    echo "  新增: ${schema_name}"
    ((copied++))
  fi
done

echo ""
echo "同步完成！新增: ${copied}, 更新: ${updated}"
echo ""

find "$LOCAL_SCHEMAS" -name "schema.yaml" | while read -r file; do
  schema_name="$(basename "$(dirname "$file")")"
  case "$LANG_ARG" in
    zh)
      sed -i '' 's/__LANG_PLACEHOLDER__/**语言**: 所有生成的文档必须使用中文。/g' "$file"
      echo "  ${schema_name}: 语言设置为中文"
      ;;
    en)
      sed -i '' 's/__LANG_PLACEHOLDER__/**Language**: All generated documents MUST be written in English./g' "$file"
      echo "  ${schema_name}: 语言设置为英文"
      ;;
    *)
      sed -i '' '/__LANG_PLACEHOLDER__/d' "$file"
      echo "  ${schema_name}: 删除语言占位符（无偏好）"
      ;;
  esac
done

echo ""
echo "语言处理完成"
