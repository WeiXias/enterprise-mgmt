# 开发记忆

> 按时间线记录每次修改的文件、改动内容和原因，便于上下文回顾。

---

## 2026-06-11

- **Nuxt 别名配置验证** — 确认 `#database`、`#schema/*`、`#enums`、`#server-utils`、`#ai-utils` 别名在 Nitro 运行时和 IDE 类型检查均正常解析；发现 vitest.config.ts 缺少子路径通配（`#schema/*` 等），待修复。
- **项目开发记忆文件** — 在 `enterprise-mgmt/MEMORY.md` 创建开发记忆文件，约定每次修改后自动追加时间线记录。

---

## 2026-06-12

- **待办模块开发** — 完成待办模块（todos）的完整功能开发，包括：
  - **后端 API** — 创建 `server/api/todos/` 目录，实现清单 CRUD、任务 CRUD + 状态切换、子任务管理、标签管理、批量操作、排序等 18 个 API 端点
  - **枚举 API 补充** — 在 `server/api/enums.get.ts` 中添加 `todoPriority`、`todoStatus`、`listColor` 三个枚举
  - **TypeScript 类型** — 在 `app/types/models.ts` 添加 TodoList、Todo、TodoSubtask、TodoTag 及相关 Payload 类型
  - **UI 常量** — 在 `app/utils/constants.ts` 添加 `TODO_PRIORITY_CONFIG`、`TODO_STATUS_CONFIG`、`LIST_COLOR_CONFIG`、`TODO_PRIORITY_QUADRANT`
  - **前端页面** — 创建 `app/pages/dashboard/todos/index.vue`，支持四象限/列表两种视图、清单管理、待办 CRUD、子任务、状态切换
  - **侧边栏入口** — 在 `app/layouts/dashboard.vue` 添加"待办"菜单项
  - **API 验证通过** — 清单创建/列表、待办创建/列表/状态切换/子任务添加/标签创建均正常

---

## 2026-06-12

- **待办模块开发** — 完成待办模块（todos）的完整功能开发，包括：
  - **后端 API** — 创建 `server/api/todos/` 目录，实现清单 CRUD（lists/）、任务 CRUD + 状态切换、子任务管理、标签管理、批量操作、排序等 18 个 API 端点
  - **枚举 API 补充** — 在 `server/api/enums.get.ts` 中添加 `todoPriority`、`todoStatus`、`listColor` 三个枚举
  - **TypeScript 类型** — 在 `app/types/models.ts` 添加 TodoList、Todo、TodoSubtask、TodoTag 及相关 Payload 类型
  - **UI 常量** — 在 `app/utils/constants.ts` 添加 `TODO_PRIORITY_CONFIG`、`TODO_STATUS_CONFIG`、`LIST_COLOR_CONFIG`、`TODO_PRIORITY_QUADRANT`
  - **前端页面** — 创建 `app/pages/dashboard/todos/index.vue`，支持四象限/列表两种视图、清单管理、待办 CRUD、子任务、状态切换
  - **侧边栏入口** — 在 `app/layouts/dashboard.vue` 添加"待办"菜单项
  - **API 验证通过** — 清单创建/列表、待办创建/列表/状态切换/子任务添加/标签创建均正常


- **首页快捷链接** — 在首页底部增加"快捷入口"模块，支持自定义固定常用功能模块图标：
  - 预定义 10 个模块（客户、商机、产品、合同、项目、待办、提成、财务、库存、畅聊）
  - localStorage 持久化用户选择（key: `dashboard-shortcuts`）
  - 编辑模式下勾选/取消固定，展示模式下点击跳转
  - 默认固定：客户、商机、合同、项目、待办

- **首页改造为工作台** — 将首页从「Dashboard 概览」改造为「以待办为核心的工作台」：
  - 合并待办逻辑到首页 `app/pages/dashboard/index.vue`（四象限视图 + 列表视图 + 快速创建 + 子任务管理）
  - 删除独立待办页面 `app/pages/dashboard/todos/` 和组件 `app/components/todos/`
  - 取消侧边栏「待办」入口（`app/layouts/dashboard.vue`）
  - 保留 KPI 卡片、最近客户、今日提醒、销售漏斗、快捷入口
