#!/usr/bin/env bash
# ============================================================
# 制作版本补丁包
# 用法：./scripts/make-patch.sh
# 输出：releases/enterprise-mgmt-YYYYMMDD-HHMMSS.tar.gz
#
# 该补丁包包含：
#   - .output/    构建产物
#   - server/database/migrations/  新迁移文件
#   - package.json / pnpm-lock.yaml
#   - start.sh
#   - scripts/    (create-admin.ts, apply-patch.sh)
#   - .env.example
# ============================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="$PROJECT_DIR/releases"
VERSION_FILE="$PROJECT_DIR/.version"

cd "$PROJECT_DIR"

# 生成版本号
if [ -f "$VERSION_FILE" ]; then
  VERSION=$(cat "$VERSION_FILE")
  # 自增 patch 号
  MAJOR=$(echo "$VERSION" | cut -d. -f1)
  MINOR=$(echo "$VERSION" | cut -d. -f2)
  PATCH=$(echo "$VERSION" | cut -d. -f3)
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
else
  NEW_VERSION="1.0.1"
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
PATCH_NAME="enterprise-mgmt-${NEW_VERSION}-${TIMESTAMP}"
PATCH_FILE="$RELEASE_DIR/${PATCH_NAME}.tar.gz"

echo "========================================="
echo "  制作补丁包"
echo "  版本: $NEW_VERSION"
echo "========================================="

# ---- 1. 构建 ----
echo "[1/4] 构建生产包..."
npx nuxt build 2>&1 | tail -5
echo "  ✓ 构建完成"

# ---- 1.5 移除非当前平台的原生模块 ----
echo "[1.5/5] 清理本机构建的原生模块（打包后将自动重建）..."
rm -f "$PROJECT_DIR/.output/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node" 2>/dev/null || true
# 同时移除所有 .node 文件
find "$PROJECT_DIR/.output/server/node_modules" -name "*.node" -delete 2>/dev/null || true
echo "  ✓ 原生模块已清除（将在服务器上重新编译）"

# ---- 2. 打包 ----
echo "[2/4] 打包..."
mkdir -p "$RELEASE_DIR/tmp/$PATCH_NAME"

# 只打包生产需要的文件
cp -r .output       "$RELEASE_DIR/tmp/$PATCH_NAME/"
cp -r server/database/migrations "$RELEASE_DIR/tmp/$PATCH_NAME/migrations" 2>/dev/null || mkdir -p "$RELEASE_DIR/tmp/$PATCH_NAME/migrations"
cp -r server/database/schema     "$RELEASE_DIR/tmp/$PATCH_NAME/server/database/schema" 2>/dev/null || true
cp drizzle.config.ts             "$RELEASE_DIR/tmp/$PATCH_NAME/" 2>/dev/null || true
cp package.json     "$RELEASE_DIR/tmp/$PATCH_NAME/"
cp pnpm-lock.yaml   "$RELEASE_DIR/tmp/$PATCH_NAME/"
cp start.sh         "$RELEASE_DIR/tmp/$PATCH_NAME/"
cp .env.example     "$RELEASE_DIR/tmp/$PATCH_NAME/"
# 部署预检脚本
cat > "$RELEASE_DIR/tmp/$PATCH_NAME/precheck.sh" << 'PRECHECK'
#!/bin/bash
# 服务器环境预检
set -e
echo "=== 环境预检 ==="
for cmd in node npm tar gcc g++ make python3 curl; do
  if command -v $cmd &>/dev/null; then echo "  ✓ $cmd"; else echo "  ✗ $cmd (需要安装)"; fi
done
if ! command -v pnpm &>/dev/null; then npm install -g pnpm 2>/dev/null && echo "  ✓ pnpm 已安装" || echo "  ✗ pnpm 安装失败"; fi
echo "=== 预检完成 ==="
PRECHECK
chmod +x "$RELEASE_DIR/tmp/$PATCH_NAME/precheck.sh"
mkdir -p "$RELEASE_DIR/tmp/$PATCH_NAME/scripts"
cp scripts/create-admin.ts "$RELEASE_DIR/tmp/$PATCH_NAME/scripts/"
cp scripts/apply-patch.sh  "$RELEASE_DIR/tmp/$PATCH_NAME/scripts/"

# 写入版本文件
echo "$NEW_VERSION" > "$RELEASE_DIR/tmp/$PATCH_NAME/.version"
echo "VERSION=$NEW_VERSION" > "$RELEASE_DIR/tmp/$PATCH_NAME/patch-info.txt"
echo "BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')" >> "$RELEASE_DIR/tmp/$PATCH_NAME/patch-info.txt"
echo "GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" >> "$RELEASE_DIR/tmp/$PATCH_NAME/patch-info.txt"

# 打包
cd "$RELEASE_DIR/tmp"
tar czf "$PATCH_FILE" "$PATCH_NAME"
rm -rf "$PATCH_NAME"
cd "$PROJECT_DIR"

# ---- 3. 生成校验 ----
echo "[3/4] 生成校验..."
HASH=$(shasum -a 256 "$PATCH_FILE" | awk '{print $1}')
SIZE=$(ls -lh "$PATCH_FILE" | awk '{print $5}')
echo "$HASH  $PATCH_NAME.tar.gz" > "${PATCH_FILE}.sha256"

# ---- 4. 更新版本号 ----
echo "[4/4] 更新版本..."
echo "$NEW_VERSION" > "$VERSION_FILE"

echo ""
echo "========================================="
echo "  补丁包已生成"
echo "  文件: $PATCH_FILE"
echo "  大小: $SIZE"
echo "  版本: $NEW_VERSION"
echo "  SHA256: $HASH"
echo "========================================="
echo ""
echo "部署方法："
echo "  1. 上传 $PATCH_NAME.tar.gz 到服务器"
echo "  2. 解压并执行 scripts/apply-patch.sh"
