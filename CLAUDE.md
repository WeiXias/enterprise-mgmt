# 企业一体化管理系统 — 项目约束

## 项目简介

企业一体化管理系统，基于 Nuxt 4 + Nuxt UI v4 + Tailwind CSS v4 的全栈 Web 应用，涵盖客户、商机、产品、合同、项目、提成、财务、进销存、分包、IM 等业务模块。

## 技术栈

- **框架**: Nuxt 4 + Nuxt UI v4 + Tailwind CSS v4
- **状态管理**: Pinia
- **数据库**: SQLite (better-sqlite3) + Drizzle ORM
- **语言**: TypeScript
- **测试**: Vitest + @nuxt/test-utils
- **包管理器**: pnpm
- **认证**: JWT (jose 库)

## 开发命令

| 命令 | 说明 |
|------|------|
| `cd enterprise-mgmt && pnpm dev` | 启动开发服务器 (端口 3000) |
| `cd enterprise-mgmt && pnpm build` | 生产构建 |
| `cd enterprise-mgmt && pnpm typecheck` | 类型检查 |
| `cd enterprise-mgmt && pnpm lint` | 代码检查 |
| `cd enterprise-mgmt && pnpm test` | 运行测试 |
| `cd enterprise-mgmt && pnpm seed` | 初始化种子数据 |
| `cd enterprise-mgmt && pnpm create-admin` | 创建管理员账户 |
| `cd enterprise-mgmt && pnpm migrate` | 数据库迁移 |

## 项目结构

```
enterprise-mgmt/              # 主应用目录
├── app/                      # 前端
│   ├── pages/                # Nuxt 文件路由（dashboard/ 下按业务分子目录）
│   ├── components/          # Vue 组件（common/ 通用 + 按业务模块分子目录）
│   ├── composables/          # 组合式函数（useApi/useTable/useEnum/useAIReview 等）
│   ├── core/                 # 核心层
│   │   └── composables/      # 核心组合函数（useAuthHeaders 等）
│   ├── modules/              # 独立业务模块（可跨页面复用）
│   │   └── im/              # IM 模块（components/composables/stores）
│   ├── stores/               # Pinia 状态管理（auth/notification/im）
│   ├── utils/                # 前端工具函数（format/validate/constants/export-csv）
│   ├── types/                # TypeScript 类型定义
│   ├── plugins/              # Nuxt 插件
│   ├── layouts/              # 布局组件
│   ├── assets/               # 静态资源（CSS 等）
│   └── middleware/           # 路由中间件
├── server/                   # 后端（Nitro）
│   ├── api/                  # RESTful API 路由（按模块分目录 + 顶层文件）
│   │   ├── auth/             # 认证
│   │   ├── users/            # 用户管理
│   │   ├── customers/        # 客户管理
│   │   ├── contacts/         # 联系人
│   │   ├── opportunities/    # 商机管理
│   │   ├── products/         # 产品管理
│   │   ├── product-categories/ # 产品分类
│   │   ├── contracts/        # 合同管理
│   │   ├── projects/         # 项目管理
│   │   ├── milestones/       # 项目里程碑
│   │   ├── deliverables/     # 项目交付物
│   │   ├── tasks/            # 项目任务
│   │   ├── time-logs/        # 工时记录
│   │   ├── risks/            # 项目风险
│   │   ├── budgets/          # 项目预算
│   │   ├── comments/         # 评论
│   │   ├── follow-ups/       # 跟进记录
│   │   ├── commissions/      # 提成管理
│   │   ├── commission-rules/ # 提成规则
│   │   ├── commission-payouts/ # 提成发放
│   │   ├── finance/          # 财务管理
│   │   ├── invoices/         # 发票管理
│   │   ├── payments/         # 付款记录
│   │   ├── payment-plans/    # 付款计划
│   │   ├── inventory/        # 进销存
│   │   ├── subcontracts/     # 分包管理
│   │   ├── subcontract-parties/ # 分包方
│   │   ├── quotes/           # 报价管理
│   │   ├── im/               # 即时通讯
│   │   ├── ai/               # AI 功能
│   │   ├── dashboard/        # 仪表盘
│   │   ├── system/           # 系统配置
│   │   ├── roles/            # 角色
│   │   ├── permissions/      # 权限
│   │   ├── departments/      # 部门
│   │   ├── tags/             # 标签
│   │   ├── notifications/    # 通知
│   │   ├── files/            # 文件管理
│   │   ├── attachments/      # 附件管理
│   │   ├── enums.get.ts      # 枚举查询
│   │   └── health.get.ts     # 健康检查
│   ├── _ai-impl/             # AI 实现层（factory/providers/crypto/types）
│   │   └── providers/        # AI 提供商（base/custom/deepseek）
│   ├── database/             # 数据库
│   │   ├── schema/           # Drizzle ORM Schema 实现 ★
│   │   ├── migrations/       # 数据库迁移 SQL 文件
│   │   └── index.ts          # 数据库连接（SQLite）
│   ├── middleware/           # 服务端中间件
│   ├── plugins/              # Nitro 插件
│   └── utils/                # 服务端工具（auth/permission/log/email/upload/pdf/response/id/mention/burndown/task-deps）
│       └── ai/               # AI 相关服务端工具
├── data/                     # SQLite 数据库文件（enterprise.db）及上传文件
├── docs/                     # 项目文档（API.md、FRONTEND.md）
├── scripts/                  # 脚本
├── tests/                    # 测试
└── releases/                 # 发布打包
```

> ★ Drizzle ORM schema 实现在 `server/database/schema/`，Nuxt alias `#database` → `server/database`、`#schema/*` → `server/database/schema/*`。

## 设计约束（核心）

### 视觉原则：温暖人性化，拒绝 AI 感

1. **色彩**：主色 Amber `#EF9F27`，底色 Warm White `#F1EFE8`，禁止紫蓝渐变、霓虹描边、冷色调大面积色块
2. **字体**：仅使用 400（正文）和 500（标题）字重，禁止 600/700/800，行高 1.6
3. **图标**：Heroicons Outline 风格，禁止几何机械图标、盾牌/大脑/AI 暗示图标
4. **圆角**：按钮 6px、小卡片 8px、大卡片 12px

### 文案规范

- 像同事聊天，不像系统提示：用"搞定了！"替代"操作成功"
- 禁用词：智能、AI、自动优化、系统、请求、处理、执行、模块、初始化
- 所有 UI 文案用口语化中文

### 交互规范

- 操作成功用轻量 toast，3 秒自动消失，禁止 modal 弹窗显示成功
- 删除操作才需要二次确认
- 加载状态用骨架屏，不用转圈动画
- 表单默认聚焦第一个输入框，回车提交

### 组件规范

1. **公共组件优先**：新建组件前先检查 `app/components/common/` 是否已有可复用的组件。如果有，必须复用；如果没有，且该组件可能被其他模块使用，则应放在 `common/` 目录
2. **必须复用的公共组件**：StatusBadge、ConfirmDialog、FormModal、PageHeader、CommonPagination、SearchBar、UserSelect、EmptyState、DataTable
3. **2 模块规则**：当一个组件被 2 个及以上模块使用时，必须从业务目录提升到 `common/`。例如 FollowUpList 最初在 customers/ 下，现已提升到 common/
4. **新组件放置规则**：
   - 通用 UI 组件（选择器、表单项、展示组件）→ `common/`
   - 业务逻辑组件（只能被当前模块用）→ `todos/`、`projects/` 等
   - 有疑问时默认放 `common/`，后续如果确认只有单模块使用再移到业务目录
5. **Composable 同理**：新建 composable 前检查 `app/composables/` 是否已有可复用的（useTable、useExportCsv、useEnum、useConfirm 等）。列表页必须用 useTable + CommonPagination

## API 规范

- API 路由在 `server/api/` 中按模块分目录，Nuxt 自动生成路由（本地直连路径如 `/api/auth/login`，Nginx 反向代理加 `/api/v1` 前缀）
- 认证方式：JWT Bearer Token（Header: `Authorization: Bearer <token>`）
- 统一响应格式：`{ code: 0, data: T, message?: string }`
- code=0 表示成功，非零为错误码
- 所有列表接口支持分页参数：`page`、`pageSize`、`sortBy`、`sortOrder`
- 删除操作执行软删除（`deletedAt`），列表默认过滤已删除数据

## 数据库规范

- Drizzle ORM schema 实现在 `server/database/schema/`，通过 `#schema/xxx` alias 引用
- 新增 schema 后需在 `server/database/schema/index.ts` 中统一导出
- schema 别名通过 `nuxt.config.ts` 中 `nitro.alias` 配置（`#schema/xxx`、`#database`、`#enums`、`#server-utils`）
- 数据库文件位于 `enterprise-mgmt/data/enterprise.db`（`DB_PATH` 环境变量可覆盖）

## 角色权限

| 角色 | 权限范围 |
|------|----------|
| 管理员 | 全部数据和系统设置 |
| 销售负责人 | 全部业务数据 |
| 销售成员 | 仅自己负责的数据 |
| 财务 | 合同/提成/回款完整权限，其余只读 |

## 验证流程

改代码后按顺序验证：

1. `cd enterprise-mgmt && pnpm typecheck` — 类型检查
2. `cd enterprise-mgmt && pnpm test` — 单元测试
3. 必要时启动 `pnpm dev` 用 curl 做端到端 API 测试
