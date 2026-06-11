#!/usr/bin/env bash
# ============================================================
# 一键部署到 172.16.100.250
# 用法：bash scripts/deploy-to-250.sh
# ============================================================
set -euo pipefail

SERVER="172.16.100.250"
USER="root"
PASS="Xiaona.1314"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="/opt/enterprise-mgmt"

# 找最新的补丁包
LATEST_TGZ=$(ls -t "$PROJECT_DIR/releases/enterprise-mgmt-"*.tar.gz 2>/dev/null | head -1)
if [ -z "$LATEST_TGZ" ]; then
  echo "没有找到补丁包，先构建一个..."
  cd "$PROJECT_DIR" && bash scripts/make-patch.sh
  LATEST_TGZ=$(ls -t "$PROJECT_DIR/releases/enterprise-mgmt-"*.tar.gz 2>/dev/null | head -1)
fi

echo "========================================="
echo "  部署到 $SERVER"
echo "  补丁包: $(basename $LATEST_TGZ)"
echo "========================================="

SSHPASS="$PASS"

# 辅助函数
run_ssh() {
  sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$USER@$SERVER" "$@"
}

run_scp() {
  sshpass -p "$SSHPASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$@"
}

# ---- 0. 检查连接 ----
echo "[0/6] 测试连接..."
if ! run_ssh "echo ok" 2>/dev/null; then
  echo "  ✗ 无法连接到服务器，请检查网络和密码"
  exit 1
fi
echo "  ✓ 连接成功"

# ---- 1. 检查/安装 Node.js ----
echo "[1/6] 检查环境..."
NODE_VER=$(run_ssh "node -v 2>/dev/null || echo 'none'")
if [ "$NODE_VER" = "none" ]; then
  echo "  安装 Node.js 22..."
  run_ssh "curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - && yum install -y nodejs" 2>&1 | tail -3
fi
echo "  Node.js: $(run_ssh 'node -v')"

# 检查 pnpm
PNPM_OK=$(run_ssh "which pnpm 2>/dev/null || echo 'none'")
if [ "$PNPM_OK" = "none" ]; then
  echo "  安装 pnpm..."
  run_ssh "npm install -g pnpm" 2>&1 | tail -2
fi
echo "  pnpm: $(run_ssh 'pnpm -v')"

# 检查编译工具
GCC_OK=$(run_ssh "which gcc 2>/dev/null || which g++ 2>/dev/null || echo 'none'")
if [ "$GCC_OK" = "none" ]; then
  echo "  安装编译工具..."
  run_ssh "yum install -y gcc-c++ python3 make" 2>&1 | tail -3
fi
echo "  ✓ 编译工具就绪"

# ---- 2. 上传补丁包 ----
echo "[2/6] 上传补丁包..."
run_scp "$LATEST_TGZ" "$USER@$SERVER:/tmp/"
LATEST_NAME=$(basename "$LATEST_TGZ")
echo "  ✓ 已上传 $LATEST_NAME"

# ---- 3. 解压 ----
echo "[3/6] 解压..."
run_ssh "mkdir -p $REMOTE_DIR"
run_ssh "cd $REMOTE_DIR && tar xzf /tmp/$LATEST_NAME --strip-components=1 2>/dev/null || tar xzf /tmp/$LATEST_NAME --strip-components=1"
echo "  ✓ 已解压到 $REMOTE_DIR"

# ---- 4. 安装依赖 + 编译原生模块 ----
echo "[4/6] 安装依赖并编译原生模块..."
run_ssh "cd $REMOTE_DIR && pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod" 2>&1 | tail -5

# 编译 root node_modules 下的 better-sqlite3
run_ssh "cd $REMOTE_DIR && pnpm rebuild better-sqlite3 2>/dev/null || (cd node_modules/better-sqlite3 && npx --yes node-gyp rebuild)" 2>&1 | tail -3

# 复制 .node 文件到 .output 的预编译路径（.output/server/node_modules 是独立的）
run_ssh "
SRC=\$(find $REMOTE_DIR/node_modules/.pnpm -name 'better_sqlite3.node' -type f 2>/dev/null | head -1)
if [ -n \"\$SRC\" ]; then
  DEST_DIR=$REMOTE_DIR/.output/server/node_modules/better-sqlite3/compiled/22.16.0/linux/x64
  mkdir -p \"\$DEST_DIR\"
  cp \"\$SRC\" \"\$DEST_DIR/better_sqlite3.node\"
  mkdir -p $REMOTE_DIR/.output/server/node_modules/better-sqlite3/build/Release
  cp \"\$SRC\" $REMOTE_DIR/.output/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node 2>/dev/null || true
  echo '  ✓ better-sqlite3 已就绪'
else
  echo '  ✗ 未找到 better-sqlite3.node，请手动编译'
fi
"

echo "  ✓ 原生模块就绪"

# ---- 5. 数据库迁移 + 创建管理员 ----
echo "[5/6] 数据库迁移..."
run_ssh "cd $REMOTE_DIR && npx drizzle-kit migrate" 2>&1 | tail -5
echo "  ✓ 迁移完成"

# 创建管理员（如不存在）
echo "  检查管理员账号..."
HAS_ADMIN=$(run_ssh "cd $REMOTE_DIR && node -e \"const D=require('better-sqlite3');const d=new D('data/enterprise.db');const r=d.prepare('select count(*) as c from users where role=?').get('admin');console.log(r.c);d.close()\" 2>/dev/null || echo '0'")
if [ "$HAS_ADMIN" = "0" ]; then
  echo "  创建默认管理员 (admin / admin123)..."
  run_ssh "cd $REMOTE_DIR && npx tsx scripts/create-admin.ts" 2>&1 | tail -3
else
  echo "  ✓ 管理员已存在"
fi

# ---- 6. 配置 .env ----
echo "[6/6] 配置并启动..."

# 检查是否已有 .env
HAS_ENV=$(run_ssh "test -f $REMOTE_DIR/.env && echo 'yes' || echo 'no'")
if [ "$HAS_ENV" = "no" ]; then
  JWT1=$(openssl rand -hex 32)
  JWT2=$(openssl rand -hex 32)
  AIKEY=$(openssl rand -hex 32)
  run_ssh "cat > $REMOTE_DIR/.env << 'ENVEOF'
JWT_SECRET=$JWT1
JWT_REFRESH_SECRET=$JWT2
AI_ENCRYPTION_KEY=$AIKEY
NUXT_PUBLIC_APP_NAME=企业一体化管理系统
ENVEOF"
  echo "  ✓ .env 已创建（已生成 JWT 密钥）"
else
  echo "  ✓ .env 已存在，跳过"
fi

# 停旧进程
run_ssh "pkill -f 'node .output' 2>/dev/null || true"
sleep 1

# 启动
run_ssh "cd $REMOTE_DIR && nohup ./start.sh > /tmp/enterprise-mgmt.log 2>&1 &"
sleep 3

# 健康检查
echo ""
echo "========================================="
if run_ssh "curl -sf http://localhost:3000/api/health" 2>/dev/null; then
  echo ""
  echo "  ✓ 部署成功！"
  echo "  访问: http://$SERVER:3000"
  echo "  管理员: admin / admin123"
else
  echo "  ⚠ 健康检查失败，远程日志："
  run_ssh "tail -20 /tmp/enterprise-mgmt.log 2>/dev/null || echo 'no log'"
fi
echo "========================================="
