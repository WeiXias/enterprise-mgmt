#!/usr/bin/env bash
# ============================================================
# 补丁包应用脚本（在服务器上运行）
# 用法：cd /opt/enterprise-mgmt && bash scripts/apply-patch.sh
#
# 或从零安装：
#   1. 上传 tar.gz 到服务器
#   2. tar xzf enterprise-mgmt-x.x.x.tar.gz -C /opt/enterprise-mgmt
#   3. cd /opt/enterprise-mgmt && bash scripts/apply-patch.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$PROJECT_DIR"

echo "========================================="
echo "  应用补丁包"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 读取版本信息
if [ -f "patch-info.txt" ]; then
  cat patch-info.txt
  echo ""
fi

# ---- 1. 备份 ----
echo "[1/5] 备份当前数据库..."
mkdir -p "$BACKUP_DIR"
if [ -f "data/enterprise.db" ]; then
  cp "data/enterprise.db" "$BACKUP_DIR/pre-patch-${TIMESTAMP}.db"
  echo "  ✓ 已备份到 data/backups/pre-patch-${TIMESTAMP}.db"
else
  echo "  ⚠ 数据库文件不存在（可能是首次安装）"
fi

# ---- 2. 安装依赖 ----
echo "[2/6] 安装依赖并重新编译原生模块..."
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
  echo "  ✓ 已安装 pnpm"
fi
# 编译 + 复制 better-sqlite3 到 .output 的两个查找路径
(cd node_modules/better-sqlite3 && npx --yes node-gyp rebuild 2>/dev/null) || true
SRC=$(find node_modules/.pnpm -name "better_sqlite3.node" -type f 2>/dev/null | head -1)
if [ -n "$SRC" ]; then
  mkdir -p .output/server/node_modules/better-sqlite3/build/Release
  cp "$SRC" .output/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>/dev/null || true
  DEST=.output/server/node_modules/better-sqlite3/compiled/$(node -v | sed "s/v//")/linux/x64
  mkdir -p "$DEST"
  cp "$SRC" "$DEST/better_sqlite3.node" 2>/dev/null || true
fi
echo "  ✓ 依赖就绪，原生模块已重建"

# ---- 3. 执行迁移 ----
echo "[3/6] 执行数据库迁移..."
if [ -d "migrations" ] && [ "$(ls -A migrations 2>/dev/null)" ]; then
  cp -r migrations/* server/database/migrations/ 2>/dev/null || true
fi
npx drizzle-kit migrate 2>&1 | sed 's/^/  /'
echo "  ✓ 迁移完成"

# ---- 4. 停旧进程 ----
echo "[4/6] 停止旧服务..."

stop_service() {
  # systemd
  if systemctl is-active --quiet enterprise-mgmt 2>/dev/null; then
    sudo systemctl stop enterprise-mgmt
    echo "  ✓ systemd 服务已停止"
    return 0
  fi

  # PM2
  if command -v pm2 &>/dev/null && pm2 list 2>/dev/null | grep -q enterprise-mgmt; then
    pm2 stop enterprise-mgmt
    echo "  ✓ PM2 进程已停止"
    return 0
  fi

  # 直接进程
  pkill -f "node .output" 2>/dev/null || true
  sleep 2
  echo "  ✓ 旧进程已停止"
}

stop_service

# ---- 5. 启动新服务 ----
echo "[5/5] 启动新服务..."

start_service() {
  # systemd
  if systemctl list-unit-files enterprise-mgmt.service &>/dev/null; then
    sudo systemctl start enterprise-mgmt
    echo "  ✓ systemd 服务已启动"
    return 0
  fi

  # PM2
  if command -v pm2 &>/dev/null; then
    pm2 start start.sh --name enterprise-mgmt 2>/dev/null || pm2 restart enterprise-mgmt
    pm2 save
    echo "  ✓ PM2 进程已启动"
    return 0
  fi

  # 直接 nohup
  nohup ./start.sh > /dev/null 2>&1 &
  echo "  ✓ 进程已启动 (PID $!)"
}

start_service

# 等 2 秒做健康检查
sleep 2

echo ""
echo "========================================="
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "  ✓ 健康检查通过"
  echo "  ✓ 补丁应用成功！"
else
  echo "  ⚠ 健康检查失败，请执行以下命令排查："
  echo "    journalctl -u enterprise-mgmt -n 50  (systemd)"
  echo "    pm2 logs enterprise-mgmt              (PM2)"
  echo "    或直接查看 nohup.out"
  echo ""
  echo "  💡 如果是原生模块问题（better-sqlite3），请运行："
  echo "    cd /opt/enterprise-mgmt && npx --yes node-gyp rebuild --directory=node_modules/better-sqlite3"
  echo "    如仍失败，请确保已安装编译工具："
  echo "      Ubuntu: sudo apt install build-essential python3"
  echo "      CentOS: sudo yum install gcc-c++ python3 make"
fi

# 清理旧备份（保留最近 5 个）
ls -t "$BACKUP_DIR"/pre-patch-*.db 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

echo "========================================="
