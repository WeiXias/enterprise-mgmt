# 企业一体化管理系统 — 生产环境部署指南（Docker 方案）

本指南使用 **Docker 镜像本地导出** 方式部署，彻底解决 Mac ↔ Linux 异构编译问题。
不走 Docker 镜像仓库，直接 scp 传输镜像文件，适合私有化部署。

## 一、本机构建 + 导出镜像包

```bash
cd enterprise-mgmt
bash scripts/docker-build.sh
```

产物在 `releases/` 目录：

```
enterprise-mgmt-1.0.5-docker.tar.gz     (约 150 MB)
enterprise-mgmt-1.0.5-docker.tar.gz.sha256
```

包内包含：
- `enterprise-mgmt-1.0.5.tar`（Docker 镜像，`docker save` 导出）
- `docker-compose.yml`
- `.env.example`
- `install.sh`（一键部署脚本）

**无论本机是 Mac/Windows，构建出来的镜像都能直接在 Linux 服务器上跑**——Nuxt 编译产物是平台无关的 JS，`better-sqlite3` 在 Dockerfile 构建阶段在 Alpine 环境下重新编译。

## 二、服务器首次部署

### 2.1 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash
# 安装 docker-compose 插件
sudo apt install docker-compose-v2 -y
```

### 2.2 上传并解压

```bash
# 本机
scp releases/enterprise-mgmt-1.0.5-docker.tar.gz user@server:/tmp/

# 服务器
cd /tmp
tar xzf enterprise-mgmt-1.0.5-docker.tar.gz
cd enterprise-mgmt-1.0.5-docker
```

### 2.3 一键部署

```bash
# 先编辑环境变量（如不需要自定义管理员可不改）
bash install.sh
```

首次部署交互流程：
1. 导入 Docker 镜像
2. 复制文件到 `/opt/enterprise-mgmt`
3. 提示编辑 `.env`（JWT 密钥等）
4. 执行数据库迁移
5. 创建管理员（默认 `admin / admin123`）
6. 启动容器

自定义管理员：

```bash
ADMIN_USERNAME=zhangsan ADMIN_PASSWORD=MyP@ss bash install.sh
```

首次部署完成后访问 `http://server-ip:3000`。

## 三、后续升级

```bash
# 本机 — 构建新版本
bash scripts/docker-build.sh

# 本机 — 上传
scp releases/enterprise-mgmt-1.0.6-docker.tar.gz user@server:/tmp/

# 服务器 — 部署
cd /tmp && tar xzf enterprise-mgmt-1.0.6-docker.tar.gz
cd enterprise-mgmt-1.0.6-docker
bash install.sh
```

升级时 `install.sh` 自动：
- 导入新镜像
- 备份数据库
- 执行新迁移
- 停旧容器、启新容器
- 健康检查

## 四、Nginx 反代

**（建议生产环境使用，与部署方式无关）**

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

    # 静态资源长期缓存
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

## 五、日常运维

```bash
# 查看日志
docker logs -f enterprise-mgmt

# 重启
cd /opt/enterprise-mgmt && docker-compose restart

# 进入容器
docker exec -it enterprise-mgmt sh

# 数据库备份
docker cp enterprise-mgmt:/opt/enterprise-mgmt/data/enterprise.db ./backup-$(date +%Y%m%d).db

# 健康检查
curl http://localhost:3000/api/health
docker inspect enterprise-mgmt --format='{{.State.Health.Status}}'

# 查看版本
cat /opt/enterprise-mgmt/version.txt
```

## 六、三种方案对比

| | tar.gz 补丁包 | Docker 私有仓库 | Docker 本地导出 |
|---|---|---|---|
| 异构支持 | ❌ 需服务器编译原生模块 | ✅ | ✅ |
| 一次构建到处跑 | ❌ | ✅ | ✅ |
| 需要镜像仓库 | — | ✅ 需要 Harbor 等 | ❌ 不需要 |
| 部署包体积 | 7 MB | — | ~150 MB |
| 部署方式 | 解压 + 脚本 | docker pull | scp + install.sh |
| 适合场景 | 小项目、有 Node 环境 | 多台服务器 | **私有化部署** |
