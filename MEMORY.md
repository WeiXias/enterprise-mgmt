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

## 2026-06-14

- **选择器规范 A 批次落地** — 完成纯机械替换：
  - `.warm-card` → `.em-card`（88 文件 / 213 处）
  - `.card` → `.em-card`（4 处）
  - `.form-group` → `mb-4`/`mb-3`/`mb-0`（43 处）
  - `.warm-badge-*` → `.em-badge-*`（0 处使用，仅删 CSS 定义）
  - 删除 `main.css` 中旧类名别名块（`.card`、`.warm-card`、`.warm-badge-*`、`.skeleton`）
  - Phase 2 令牌统一已在之前全部完成
  - Phase 3 部分完成：旧 class 替换、旧 CSS 删除；`rounded-lg` 迁移和 `blue-*/stone-*/amber-*` 别名移除待后续批次

- **选择器规范 B1 批次 — rounded-lg 迁移** — 将 584 处 `rounded-lg` 统一迁移为规范圆角值：
  - 全量 `rounded-lg` → `rounded-md`（6px，表单输入框、按钮、菜单项、列表项、小元素）
  - 卡片/面板/弹出层 → `rounded-xl`（12px）：CustomerSelect/UserSelect/ProductSelect 下拉面板、emoji 选择器、mention 弹出层、看板列、合同编辑器、电子表格编辑器、报价卡片、设置模块卡片、模板选择器卡片等
  - `rounded-lg` 0 残留，typecheck 错误均为既有问题（dict-seed.ts、mention.ts），与本次修改无关

- **选择器规范 B2 批次 — border-gray-* 迁移** — 将 367 处 `border-gray-*` 统一迁移为语义令牌：
  - `border-gray-200`（267处）→ `border-line`
  - `border-gray-100`（63处）→ `border-line-light`
  - `border-gray-300`（18处）→ `border-line`
  - `border-gray-50`（19处）→ `border-line-light`
  - Vue 文件中 `border-gray-*` 0 残留；constants.ts 中 `stone` 主题的 `border-gray-200` 保留（语义化颜色配置）
  - `divide-gray-*` 早已清理完毕
  - typecheck 错误均为既有问题，与本次无关

- **选择器规范 B3 批次 — text-gray-* 迁移** — 将 1562 处 `text-gray-*` 统一迁移为语义令牌：
  - `text-gray-400`(656处) / `text-gray-500`(110处) / `text-gray-300`(55处) / `text-gray-200`(3处) → `text-content-muted`
  - `text-gray-600`(397处) / `text-gray-700`(231处) → `text-content-secondary`
  - `text-gray-800`(100处) / `text-gray-900`(10处) → `text-content-primary`
  - Vue 文件中 `text-gray-*` 0 残留；constants.ts 中状态标签色配置保留
  - typecheck 错误均为既有问题，与本次无关

- **选择器规范 B4 批次 — bg-gray-* 迁移** — 将 232 处 `bg-gray-*` 统一迁移为语义令牌：
  - `hover:bg-gray-50/100/200` → `hover:bg-surface-hover`
  - `bg-gray-50`（54处）→ `bg-surface-hover`
  - `bg-gray-50/50` → `bg-surface-hover/50`
  - `bg-gray-100`（57处）→ `bg-surface-hover`
  - `bg-gray-200`（10处）→ `bg-line`（骨架屏/分割线）
  - `bg-gray-300`（25处）、`bg-gray-400`（6处）保留——语义化装饰色（状态点、漏斗图、看板列色），不属于表面色系统
  - constants.ts 中状态标签色配置保留
  - typecheck 错误均为既有问题，与本次无关

- **选择器规范 B5 批次 — 旧令牌别名移除** — 清理所有旧兼容层残留：
  - `accent-amber-500`（1处，settings 页面 range 输入）→ `accent-brand-500`
  - `main.css` 删除"旧名称 (blue-*, stone-*) 全部保留做过渡兼容"过时注释
  - `blue-*/stone-*/amber-*` 在代码中 0 引用

- **选择器规范 B6 批次 — input-base 工具类推广** — 将 349 处表单输入框冗余 class 组合替换为 `input-base` + `focus-ring`：
  - 标准模式 `px-3 h-9 text-sm rounded-md border border-line bg-surface-card focus-ring` → `input-base focus-ring`
  - 搜索框模式 `pl-8/pl-9 h-9 text-sm rounded-md border border-line focus-ring` → `pl-8/pl-9 input-base focus-ring`
  - select 模式 `px-3 h-9 text-sm rounded-md border border-line bg-surface-card` → `input-base`
  - 自定义 focus 模式（settings 页面）保留 `focus:outline-none focus:border-brand-400`
  - textarea 保持 `px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none` 不变（`input-base` 有固定 `h-9`）
  - 清理了 `input-base` 旁冗余的 `bg-surface-card`
  - `h-9 text-sm rounded-md border border-line` 0 残留
