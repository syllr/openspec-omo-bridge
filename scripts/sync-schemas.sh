#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO_SCHEMAS="${REPO_DIR}/schemas"
LOCAL_SCHEMAS="${HOME}/.local/share/openspec/schemas"

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
