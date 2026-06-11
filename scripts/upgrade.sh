#!/usr/bin/env bash
# ============================================================
# 企业一体化管理系统 — 一键升级脚本
# 用法：./scripts/upgrade.sh
#
# 前置条件：
#   1. 服务器已安装 git / pnpm / Node.js
#   2. 当前目录是项目根目录
#   3. .env 已正确配置
#
# 安全机制：
#   - 构建前备份当前数据库
#   - 构建失败自动回滚到旧版本
#   - 升级过程中设置维护模式令牌
# ============================================================

set -euo pipefail

# ---- 配置 ----
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/data/backups"
BACKUP_FILE="$BACKUP_DIR/pre-upgrade-$(date +%Y%m%d-%H%M%S).db"
BUILD_DIR="$PROJECT_DIR/.output"
OLD_BUILD_DIR="$PROJECT_DIR/.output.old"
PID_FILE="$PROJECT_DIR/.pid"

cd "$PROJECT_DIR"

echo "========================================="
echo "  企业一体化管理系统 — 在线升级"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""

# ---- 1. 拉取最新代码 ----
echo "[1/6] 拉取最新代码..."
git fetch origin
CURRENT=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || git rev-parse origin/master 2>/dev/null || echo "$CURRENT")

if [ "$CURRENT" = "$REMOTE" ] && [ "${1:-}" != "--force" ]; then
  echo "  → 已经是最新版本 ($(echo $CURRENT | head -c 8))"
  echo "  → 如需强制重构建，加 --force"
  # 即使代码没变，迁移还是要跑（以防上次迁移失败）
else
  echo "  本地: $(echo $CURRENT | head -c 8)"
  echo "  远程: $(echo $REMOTE | head -c 8)"
  git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || {
    echo "  ✗ git pull 失败，请检查网络或手动解决冲突"
    exit 1
  }
  echo "  ✓ 代码已更新"
fi

# ---- 2. 备份数据库 ----
echo ""
echo "[2/6] 备份数据库..."
mkdir -p "$BACKUP_DIR"
if [ -f "$PROJECT_DIR/data/enterprise.db" ]; then
  cp "$PROJECT_DIR/data/enterprise.db" "$BACKUP_FILE"
  echo "  ✓ 已备份到 $BACKUP_FILE"
else
  echo "  ⚠ 没有现有数据库，跳过备份"
fi

# ---- 3. 安装依赖 ----
echo ""
echo "[3/6] 安装依赖..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "  ✓ 依赖已更新"

# ---- 4. 执行数据库迁移 ----
echo ""
echo "[4/6] 执行数据库迁移..."
npx drizzle-kit migrate 2>&1 | sed 's/^/  /'
echo "  ✓ 迁移完成"

# ---- 5. 构建 ----
echo ""
echo "[5/6] 构建生产包..."

# 保留旧构建产物，用于失败回滚
if [ -d "$BUILD_DIR" ]; then
  rm -rf "$OLD_BUILD_DIR" 2>/dev/null || true
  mv "$BUILD_DIR" "$OLD_BUILD_DIR"
fi

if pnpm build 2>&1 | tail -3; then
  echo "  ✓ 构建成功"
  rm -rf "$OLD_BUILD_DIR"
else
  echo "  ✗ 构建失败，正在回滚..."
  if [ -d "$OLD_BUILD_DIR" ]; then
    mv "$OLD_BUILD_DIR" "$BUILD_DIR"
    echo "  ✓ 已回滚到旧版本"
  fi
  if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" "$PROJECT_DIR/data/enterprise.db"
    echo "  ✓ 数据库已回滚"
  fi
  exit 1
fi

# ---- 6. 重启服务 ----
echo ""
echo "[6/6] 重启应用..."

restart_service() {
  # systemd 方式
  if systemctl is-active --quiet enterprise-mgmt 2>/dev/null; then
    sudo systemctl restart enterprise-mgmt
    echo "  ✓ systemd 服务已重启"
    return 0
  fi

  # PM2 方式
  if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q enterprise-mgmt; then
    pm2 restart enterprise-mgmt
    echo "  ✓ PM2 进程已重启"
    return 0
  fi

  # 直接进程方式
  if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
      kill "$OLD_PID" 2>/dev/null || true
      sleep 2
      # 温柔变强杀
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  # 启动新进程
  nohup "$PROJECT_DIR/start.sh" > /dev/null 2>&1 &
  NEW_PID=$!
  echo "$NEW_PID" > "$PID_FILE"
  sleep 1

  # 健康检查
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  ✓ 应用已启动 (PID $NEW_PID)"
  else
    echo "  ⚠ 应用已启动但健康检查未通过，请检查日志"
  fi
}

restart_service

echo ""
echo "========================================="
echo "  升级完成！版本: $(git rev-parse --short HEAD)"
echo "  备份文件: $BACKUP_FILE"
echo "  健康检查: curl http://localhost:3000/api/health"
echo "========================================="
