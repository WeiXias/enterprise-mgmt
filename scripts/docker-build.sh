#!/usr/bin/env bash
# ============================================================
# 构建 Docker 镜像并导出为本地文件
# 用法：./scripts/docker-build.sh
#
# 输出：releases/enterprise-mgmt-1.0.5-docker.tar.gz
#       包含 docker 镜像 + docker-compose.yml + .env.example
# ============================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="$PROJECT_DIR/.version"
RELEASE_DIR="$PROJECT_DIR/releases"

cd "$PROJECT_DIR"

# 版本
if [ -f "$VERSION_FILE" ]; then
  VERSION=$(cat "$VERSION_FILE")
  MAJOR=$(echo "$VERSION" | cut -d. -f1)
  MINOR=$(echo "$VERSION" | cut -d. -f2)
  PATCH=$(echo "$VERSION" | cut -d. -f3)
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
else
  NEW_VERSION="1.0.1"
fi

IMAGE_NAME="enterprise-mgmt"
IMAGE_TAG="${IMAGE_NAME}:${NEW_VERSION}"
IMAGE_FILE="${IMAGE_NAME}-${NEW_VERSION}.tar"
PACKAGE_NAME="${IMAGE_NAME}-${NEW_VERSION}-docker"
PACKAGE_FILE="$RELEASE_DIR/${PACKAGE_NAME}.tar.gz"

echo "========================================="
echo "  构建 Docker 镜像（本地导出）"
echo "  版本: $NEW_VERSION"
echo "========================================="

# ---- 1. 构建镜像 ----
echo "[1/3] 构建 Docker 镜像..."
docker build -t "$IMAGE_TAG" -t "${IMAGE_NAME}:latest" .
echo "  ✓ 镜像构建完成: $IMAGE_TAG"

# ---- 2. 导出镜像 ----
echo "[2/3] 导出镜像..."
mkdir -p "$RELEASE_DIR/tmp/${PACKAGE_NAME}"

docker save -o "$RELEASE_DIR/tmp/${PACKAGE_NAME}/${IMAGE_FILE}" "$IMAGE_TAG"

# 附带部署文件
cp docker-compose.yml "$RELEASE_DIR/tmp/${PACKAGE_NAME}/"
cp .env.example        "$RELEASE_DIR/tmp/${PACKAGE_NAME}/"
cp scripts/create-admin.ts "$RELEASE_DIR/tmp/${PACKAGE_NAME}/"
cp scripts/apply-patch.sh "$RELEASE_DIR/tmp/${PACKAGE_NAME}/" 2>/dev/null || true

# 服务器上的一键部署脚本
cat > "$RELEASE_DIR/tmp/${PACKAGE_NAME}/install.sh" << 'INSTALL_SCRIPT'
#!/bin/bash
# 在服务器上运行此脚本完成部署
set -e

echo "========================================="
echo "  企业一体化管理系统 — Docker 部署"
echo "========================================="

# 1. 导入镜像
echo "[1/4] 导入 Docker 镜像..."
docker load -i enterprise-mgmt-*.tar
echo "  ✓ 镜像已导入"

# 2. 创建目录并复制文件
INSTALL_DIR="${INSTALL_DIR:-/opt/enterprise-mgmt}"
mkdir -p "$INSTALL_DIR"
cp docker-compose.yml "$INSTALL_DIR/"
cp .env.example "$INSTALL_DIR/.env" 2>/dev/null || true
cp create-admin.ts "$INSTALL_DIR/" 2>/dev/null || true
echo "  ✓ 文件已复制到 $INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. 引导配置
if ! grep -q "JWT_SECRET=" .env 2>/dev/null || grep -q "changeme" .env 2>/dev/null; then
  echo ""
  echo "  ⚠ 请编辑 .env 填入密钥："
  echo "    JWT_SECRET=$(openssl rand -hex 32)"
  echo "    JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
  echo "    AI_ENCRYPTION_KEY=$(openssl rand -hex 32)"
  echo ""
  read -p "  按回车键继续（请确保已编辑 .env）..."
fi

# 4. 首次启动
echo "[3/4] 执行数据库迁移..."
docker-compose run --rm enterprise-mgmt sh -c "npx drizzle-kit migrate" 2>/dev/null || \
  docker run --rm -v enterprise_data:/opt/enterprise-mgmt/data --env-file .env enterprise-mgmt:latest sh -c "npx drizzle-kit migrate"
echo "  ✓ 迁移完成"

echo "[4/4] 创建管理员账号..."
docker run --rm -v enterprise_data:/opt/enterprise-mgmt/data --env-file .env \
  -e ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" \
  -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}" \
  enterprise-mgmt:latest sh -c "npx tsx /opt/enterprise-mgmt/scripts/create-admin.ts" 2>/dev/null || \
  docker run --rm -v enterprise_data:/opt/enterprise-mgmt/data --env-file .env \
    -e ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" \
    -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}" \
    enterprise-mgmt:latest sh -c "npx tsx /create-admin.ts" 2>/dev/null || \
  echo "  ⚠ 管理员创建失败，请手动执行"

docker-compose up -d
sleep 3

echo ""
echo "========================================="
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "  ✓ 部署成功！"
  echo "  访问: http://localhost:3000"
else
  echo "  ⚠ 健康检查失败，请检查：docker logs enterprise-mgmt"
fi
echo "========================================="
INSTALL_SCRIPT

chmod +x "$RELEASE_DIR/tmp/${PACKAGE_NAME}/install.sh"

# 版本信息
echo "VERSION=$NEW_VERSION"  > "$RELEASE_DIR/tmp/${PACKAGE_NAME}/version.txt"
echo "BUILD_TIME=$(date '+%Y-%m-%d %H:%M:%S')" >> "$RELEASE_DIR/tmp/${PACKAGE_NAME}/version.txt"

# ---- 3. 打包 ----
echo "[3/3] 打包..."
cd "$RELEASE_DIR/tmp"
tar czf "$PACKAGE_FILE" "$PACKAGE_NAME"
rm -rf "$PACKAGE_NAME"
cd "$PROJECT_DIR"

# 更新版本
echo "$NEW_VERSION" > "$VERSION_FILE"

# 校验
HASH=$(shasum -a 256 "$PACKAGE_FILE" | awk '{print $1}')
SIZE=$(ls -lh "$PACKAGE_FILE" | awk '{print $5}')
echo "$HASH  ${PACKAGE_NAME}.tar.gz" > "${PACKAGE_FILE}.sha256"

echo ""
echo "========================================="
echo "  镜像包已生成"
echo "  文件: $PACKAGE_FILE"
echo "  大小: $SIZE"
echo "  版本: $NEW_VERSION"
echo "  SHA256: $HASH"
echo "========================================="
echo ""
echo "部署方法（服务器上）："
echo "  1. scp ${PACKAGE_NAME}.tar.gz user@server:/tmp/"
echo "  2. ssh user@server"
echo "  3. cd /tmp && tar xzf ${PACKAGE_NAME}.tar.gz"
echo "  4. cd ${PACKAGE_NAME} && bash install.sh"
