#!/usr/bin/env bash
# ============================================================
# Docker 环境下的系统升级脚本。
# 拉取新镜像 → 备份 DB → 执行迁移 → 重新创建容器
# ============================================================
set -euo pipefail

IMAGE="${1:-enterprise-mgmt:latest}"
CONTAINER="enterprise-mgmt"
BACKUP_DIR="./data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "========================================="
echo "  Docker 容器升级"
echo "  镜像: $IMAGE"
echo "========================================="

# 1. 拉取新镜像
echo "[1/5] 拉取新镜像..."
docker pull "$IMAGE"

# 2. 备份数据库
echo "[2/5] 备份数据库..."
mkdir -p "$BACKUP_DIR"
if docker exec "$CONTAINER" test -f /opt/enterprise-mgmt/data/db/enterprise.db 2>/dev/null; then
  docker cp "$CONTAINER:/opt/enterprise-mgmt/data/db/enterprise.db" "$BACKUP_DIR/enterprise-pre-upgrade-${TIMESTAMP}.db"
  echo "  ✓ 已备份到 $BACKUP_DIR/enterprise-pre-upgrade-${TIMESTAMP}.db"
else
  echo "  ⚠ 数据库不存在（首次部署？）"
fi

# 3. 停旧容器
echo "[3/5] 停止旧容器..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm "$CONTAINER" 2>/dev/null || true

# 4. 执行迁移（用新镜像临时跑一次）
echo "[4/5] 执行数据库迁移..."
docker run --rm \
  -v enterprise_data:/opt/enterprise-mgmt/data \
  --env-file .env \
  "$IMAGE" \
  sh -c "npx drizzle-kit migrate" 2>&1 | sed 's/^/  /'
echo "  ✓ 迁移完成"

# 5. 启动新容器
echo "[5/5] 启动新容器..."
docker-compose up -d

sleep 3

echo ""
echo "========================================="
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "  ✓ 健康检查通过"
  echo "  ✓ 升级完成！"
else
  echo "  ⚠ 健康检查失败，回滚中..."
  docker stop "$CONTAINER" 2>/dev/null || true
  docker rm "$CONTAINER" 2>/dev/null || true
  if [ -f "$BACKUP_DIR/enterprise-pre-upgrade-${TIMESTAMP}.db" ]; then
    # 创建一个临时容器恢复数据库
    docker run --rm -d --name enterprise-restore \
      -v enterprise_data:/opt/enterprise-mgmt/data \
      "$IMAGE" sh -c "sleep 3600" 2>/dev/null || true
    docker cp "$BACKUP_DIR/enterprise-pre-upgrade-${TIMESTAMP}.db" enterprise-restore:/opt/enterprise-mgmt/data/db/enterprise.db
    docker stop enterprise-restore 2>/dev/null || true
    echo "  ✓ 数据库已回滚"
  fi
  docker-compose up -d
  echo "  ⚠ 已回滚到旧版本"
fi
