# 企业一体化管理系统 — 生产环境部署指南

## 前置条件

- 服务器安装 Node.js ≥ 22
- 本机可执行编译构建

## 一、本机编译打包

```bash
cd enterprise-mgmt
pnpm build                     # 非必需，make-patch.sh 内部会先执行
bash scripts/make-patch.sh     # 编译 + 打包
```

输出在 `releases/` 目录：

```
enterprise-mgmt-1.0.3-20260611-001108.tar.gz          (8.1 MB)
enterprise-mgmt-1.0.3-20260611-001108.tar.gz.sha256   (校验)
```

包内不包含源码，只有`.output/`、`migrations/`、`scripts/apply-patch.sh`、`scripts/create-admin.ts`、`start.sh`。

## 二、首次部署（服务器）

### 2.1 上传并解压

```bash
# 本机
scp releases/enterprise-mgmt-1.0.3-*.tar.gz user@server:/opt/
scp releases/enterprise-mgmt-1.0.3-*.tar.gz.sha256 user@server:/opt/

# 服务器 — 校验完整性
cd /opt
shasum -a 256 -c enterprise-mgmt-1.0.3-*.tar.gz.sha256
# 输出：enterprise-mgmt-1.0.3-20260611-001108.tar.gz: OK

# 解压
mkdir enterprise-mgmt
tar xzf enterprise-mgmt-1.0.3-*.tar.gz -C enterprise-mgmt --strip-components=1
```

### 2.2 生成密钥并配置

```bash
cd /opt/enterprise-mgmt
cp .env.example .env

# 生成 3 个随机密钥
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)" >> .env
echo "AI_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# 编辑邮件配置
vi .env   # 填入 SMTP_HOST / SMTP_USER / SMTP_PASS 等
```

### 2.3 安装编译工具（Ubuntu）并安装依赖

better-sqlite3 需要在 Linux 上重新编译。先安装编译工具：

```bash
# Ubuntu/Debian
sudo apt install build-essential python3 -y

# CentOS/RHEL
sudo yum install gcc-c++ python3 make -y
```

然后：

```bash
cd /opt/enterprise-mgmt
pnpm install --prod                # 安装依赖 + 重新编译原生模块
npx drizzle-kit migrate            # 建表
npx tsx scripts/create-admin.ts    # 创建管理员（默认 admin / admin123）
```

可通过环境变量自定义管理员：
```bash
ADMIN_USERNAME=zhangsan ADMIN_PASSWORD=MyP@ss npx tsx scripts/create-admin.ts
```

### 2.4 启动

```bash
./start.sh
```

## 三、后续更新

```bash
# 本机 — 打包新版本
bash scripts/make-patch.sh

# 本机 — 上传
scp releases/enterprise-mgmt-x.x.x-*.tar.gz user@server:/tmp/

# 服务器 — 解压 + 升级
cd /opt/enterprise-mgmt
tar xzf /tmp/enterprise-mgmt-x.x.x-*.tar.gz --strip-components=1
bash scripts/apply-patch.sh
```

`apply-patch.sh` 自动完成：备份数据库 → 安装依赖 → 执行新迁移 → 停旧进程 → 启新进程 → 健康检查

## 四、版本回滚

```bash
systemctl stop enterprise-mgmt                          # 停服
cp data/backups/pre-patch-20260611-143000.db data/enterprise.db   # 恢复DB
tar xzf /tmp/旧版本.tar.gz --strip-components=1          # 恢复文件
systemctl start enterprise-mgmt                          # 启动
```

## 五、Nginx 反代（推荐）

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

    # 静态资源长期缓存（Nuxt 构建产物带 hash）
    location /_nuxt/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50m;
    }
}
```

## 六、systemd 守护进程（推荐）

`/etc/systemd/system/enterprise-mgmt.service`：

```ini
[Unit]
Description=企业一体化管理系统
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/enterprise-mgmt
ExecStart=/opt/enterprise-mgmt/start.sh
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now enterprise-mgmt
```

## 七、日常运维

```bash
# 健康检查
curl http://localhost:3000/api/health

# 查看日志（JSON 格式每行一条）
journalctl -u enterprise-mgmt -f

# 数据库定时备份（crontab）
0 3 * * * cp /opt/enterprise-mgmt/data/enterprise.db /backup/enterprise-$(date +\%Y\%m\%d).db
```

## 八、故障排查

| 问题 | 检查 |
|---|---|
| 启动失败 | `.env` 中 JWT_SECRET 是否填写 |
| 登录报错 | `npx drizzle-kit migrate` 是否执行过 |
| 邮件不发 | SMTP 配置是否填写正确 |
| 上传失败 | Nginx `client_max_body_size` 是否够大 |
| 端口冲突 | `lsof -i :3000` |
| 升级失败 | 回滚到旧版本数据库 + 文件 |
