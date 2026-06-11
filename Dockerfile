# ---- 构建阶段 ----
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# 清理不在生产包中的文件和本机构建的二进制模块
RUN find .output/server/node_modules -name "*.node" -delete 2>/dev/null || true
# 只保留 .output、migrations、scripts、start.sh
RUN rm -rf app server node_modules .nuxt tests

# ---- 运行阶段 ----
FROM node:22-alpine

WORKDIR /opt/enterprise-mgmt

# 安装编译 better-sqlite3 所需的系统依赖
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/.output      ./.output
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/start.sh     ./
COPY --from=builder /app/scripts      ./scripts
COPY --from=builder /app/server/database/migrations ./server/database/migrations
COPY --from=builder /app/.env.example ./

RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm install --prod --frozen-lockfile && \
    # 重新编译 better-sqlite3 以匹配 alpine 架构
    cd node_modules/better-sqlite3 && npx --yes node-gyp rebuild && cd ../..

# 数据目录挂载点
RUN mkdir -p data/backups data/uploads
VOLUME /opt/enterprise-mgmt/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',r=>{process.exit(r.statusCode===200?0:1)})"

CMD ["./start.sh"]
