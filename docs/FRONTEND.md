# 前端架构设计文档

> 企业一体化管理系统 — Nuxt 3 + Nuxt UI 前端架构

---

## 〇、视觉设计原则 — 温暖人性化，拒绝 AI 感

> **核心理念**：用户感受到的是人与人之间的交流氛围，而非与 AI 对话的冰冷体验。所有视觉元素和文案都应贴近自然、人性化。

### 0.1 禁止使用的 AI 感视觉特征

| 禁止项 | 说明 | 替代方案 |
|--------|------|----------|
| 紫蓝渐变光效 | 典型 AI/SaaS 风格，冷冰冰 | 暖色实色填充（Amber / Teal） |
| 霓虹描边 / 光晕 | 科幻感、全息感 | 纯色描边 0.5-1px，暖色调 |
| 冷色调大面积色块 | 蓝紫色系让人感觉在跟机器对话 | 暖灰底色 + Amber 主色 + 实色按钮 |
| 几何机械图标 | 六边形网格、芯片纹理 | Heroicons Outline，1.5px 描边，圆角柔和 |
| 科幻感排版 | 等宽字体、矩阵布局、数据流 | 正常中文排版，1.6 行高，呼吸感间距 |
| 盾牌/安全锁/大脑图标 | 暗示 AI/安全/智能 | 日常物品化图标：人、笔、文件夹、时钟 |
| Loading 动效过于酷炫 | 粒子旋转、光线扫过、波纹扩散 | 简单的圆点跳动或进度条 |

### 0.2 色彩体系

```
主色（Primary）:   Amber #EF9F27  — 导航激活、主操作、重要标记
辅色（Secondary）: Teal  #1D9E75  — 成功状态、辅助操作
强调（Accent）:     Coral #D85A30  — 警告、需要关注
中性（Neutral）:    Warm Gray #5F5E5A — 正文、边框
底色（Surface）:    Warm White #F1EFE8 — 页面背景、卡片底色
危险（Danger）:     Warm Red #E24B4A  — 删除、错误
信息（Info）:       Warm Blue #378ADD — 提示、链接

渐变规则：仅允许浅底到白的自然过渡（如 #F1EFE8 → #FFFFFF），
          禁止任何多色渐变、彩虹渐变、方向性渐变。
```

### 0.3 字体与排版

```
字体栈：-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif
字重：仅使用 400（正文）和 500（标题），禁止 600/700/800
标题：15px / weight 500 / color #444441（暖灰）
正文：13px / weight 400 / color #5F5E5A（中性灰）
辅助：12px / weight 400 / color #888780（浅灰）
行高：1.6（呼吸感，不要紧凑）
圆角：6px 按钮 / 8px 小卡片 / 12px 大卡片
```

### 0.4 文案表达规范

**核心原则：像同事聊天，不像系统提示。**

| 场景 | 机器式（禁止） | 口语化（推荐） |
|------|----------------|----------------|
| 操作成功 | "系统已成功处理您的请求" | "搞定了！客户已添加" |
| 必填校验 | "请输入必填字段：客户名称" | "客户名称还没填呢" |
| 保存确认 | "您的数据已成功保存至系统" | "已保存，随时可以改" |
| 数据展示 | "智能分析结果如下" | "来看看这个月的数据" |
| 操作失败 | "错误代码：ERR_VALIDATION_FAILED" | "有点问题，检查一下再试" |
| 删除确认 | "确认删除该记录？此操作不可逆" | "删了就找不回来了，确定？" |
| 空状态 | "暂无数据记录" | "还没有客户，加一个？" |
| 加载中 | "数据加载中，请稍候..." | "马上就好..." |
| 权限不足 | "您没有权限执行此操作" | "这个需要管理员才能操作" |
| 搜索提示 | "请输入搜索关键词" | "搜客户名、联系人、电话..." |

**文案禁用词**：智能、AI、自动优化、系统、请求、处理、执行、模块、初始化

### 0.5 交互风格

```
1. 模拟真实用户操作习惯
   - 表单默认聚焦第一个输入框
   - 回车提交表单（不需要点按钮）
   - 列表页点击行直接跳详情
   - 金额输入自动格式化千分位

2. 反馈即时、自然
   - 操作成功用轻量 toast，3秒后自动消失
   - 不用 modal 弹窗显示成功消息
   - 删除操作才需要二次确认
   - 加载状态用骨架屏，不用转圈动画

3. 减少认知负担
   - 一个页面一个主操作
   - 默认值智能填充（如今天日期、当前用户）
   - 危险操作红色，普通操作主色
   - 不用悬停才显示的操作按钮
```

---

## 一、目录结构

```
├── app/
│   ├── pages/                    # 页面路由（Nuxt 3 文件路由）
│   │   ├── auth/
│   │   │   └── login.vue        # 登录页
│   │   ├── dashboard/
│   │   │   ├── index.vue        # 仪表盘
│   │   │   ├── customers/
│   │   │   │   ├── index.vue    # 客户列表
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── index.vue    # 客户详情
│   │   │   │   │   └── edit.vue     # 编辑客户
│   │   │   │   └── create.vue  # 新建客户
│   │   │   ├── opportunities/
│   │   │   │   ├── index.vue    # 商机列表
│   │   │   │   ├── funnel.vue   # 销售漏斗
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── index.vue
│   │   │   │   │   └── edit.vue
│   │   │   │   └── create.vue
│   │   │   ├── products/
│   │   │   │   ├── index.vue    # 产品列表
│   │   │   │   ├── [id]/
│   │   │   │   │   └── edit.vue
│   │   │   │   └── create.vue
│   │   │   ├── contracts/
│   │   │   │   ├── index.vue    # 合同列表
│   │   │   │   ├── ledger.vue   # 合同台账
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── index.vue
│   │   │   │   │   └── edit.vue
│   │   │   │   └── create.vue
│   │   │   ├── projects/
│   │   │   │   ├── index.vue    # 项目列表
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── index.vue
│   │   │   │   │   └── edit.vue
│   │   │   │   └── create.vue
│   │   │   ├── commissions/
│   │   │   │   ├── index.vue    # 提成列表
│   │   │   │   ├── rules.vue    # 提成规则
│   │   │   │   └── payouts.vue  # 提成发放
│   │   │   ├── users/
│   │   │   │   └── index.vue    # 用户管理
│   │   │   ├── settings/
│   │   │   │   └── index.vue    # 系统设置
│   │   │   └── logs/
│   │   │       └── index.vue    # 操作日志
│   │   └── profile/
│   │       └── index.vue        # 个人中心
│   │
│   ├── layouts/
│   │   ├── default.vue          # 主布局（侧边栏 + 顶栏 + 内容区）
│   │   └── blank.vue            # 空白布局（登录页用）
│   │
│   ├── components/
│   │   ├── common/              # 通用组件
│   │   │   ├── PageHeader.vue
│   │   │   ├── DataTable.vue
│   │   │   ├── SearchBar.vue
│   │   │   ├── StatusBadge.vue
│   │   │   ├── FormModal.vue
│   │   │   ├── ConfirmDialog.vue
│   │   │   ├── FileUpload.vue
│   │   │   ├── AmountInput.vue
│   │   │   ├── UserSelect.vue
│   │   │   ├── CustomerSelect.vue
│   │   │   ├── ProductSelect.vue
│   │   │   ├── DateRangePicker.vue
│   │   │   ├── TagInput.vue
│   │   │   └── EmptyState.vue
│   │   │
│   │   ├── layout/              # 布局组件
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppTopbar.vue
│   │   │   ├── AppBreadcrumb.vue
│   │   │   └── NotificationBell.vue
│   │   │
│   │   ├── dashboard/           # 仪表盘组件
│   │   │   ├── KpiCards.vue
│   │   │   ├── ReminderList.vue
│   │   │   ├── FunnelChart.vue
│   │   │   ├── PaymentTrend.vue
│   │   │   └── ActivityTimeline.vue
│   │   │
│   │   ├── customers/           # 客户业务组件
│   │   │   ├── CustomerForm.vue
│   │   │   ├── CustomerCard.vue
│   │   │   ├── ContactList.vue
│   │   │   ├── ContactForm.vue
│   │   │   ├── FollowUpList.vue
│   │   │   ├── FollowUpForm.vue
│   │   │   └── CustomerStats.vue
│   │   │
│   │   ├── opportunities/       # 商机业务组件
│   │   │   ├── OpportunityForm.vue
│   │   │   ├── OpportunityCard.vue
│   │   │   ├── FunnelBoard.vue
│   │   │   ├── QuoteForm.vue
│   │   │   ├── QuotePreview.vue
│   │   │   └── OpportunityStats.vue
│   │   │
│   │   ├── products/            # 产品业务组件
│   │   │   ├── ProductForm.vue
│   │   │   ├── ProductImport.vue
│   │   │   ├── CategoryTree.vue
│   │   │   └── ProductStats.vue
│   │   │
│   │   ├── contracts/           # 合同业务组件
│   │   │   ├── ContractForm.vue
│   │   │   ├── ContractCard.vue
│   │   │   ├── PaymentPlanForm.vue
│   │   │   ├── PaymentList.vue
│   │   │   ├── PaymentForm.vue
│   │   │   ├── ContractLedger.vue
│   │   │   ├── ContractApproval.vue
│   │   │   └── PaymentStats.vue
│   │   │
│   │   ├── projects/            # 项目业务组件
│   │   │   ├── ProjectForm.vue
│   │   │   ├── ProjectCard.vue
│   │   │   ├── TaskBoard.vue
│   │   │   ├── TaskForm.vue
│   │   │   ├── GanttChart.vue
│   │   │   ├── MemberList.vue
│   │   │   ├── DeliverableList.vue
│   │   │   └── DeliverableUpload.vue
│   │   │
│   │   └── commissions/         # 提成业务组件
│   │       ├── CommissionRuleForm.vue
│   │       ├── CommissionList.vue
│   │       ├── CommissionAdjustForm.vue
│   │       ├── PayoutForm.vue
│   │       └── CommissionStats.vue
│   │
│   ├── composables/             # 组合式函数
│   │   ├── useApi.ts            # API 请求封装
│   │   ├── useAuthHeaders.ts    # 认证头
│   │   ├── useTable.ts          # 列表通用逻辑
│   │   ├── useEnum.ts           # 枚举值缓存
│   │   ├── useConfirm.ts        # 确认弹窗
│   │   ├── useExport.ts         # Excel 导出
│   │   ├── useExportCsv.ts      # CSV 导出
│   │   ├── useTheme.ts          # 主题
│   │   └── ...
│   │
│   ├── stores/                  # Pinia 状态管理
│   │   ├── auth.ts              # 用户认证状态
│   │   ├── notification.ts      # 通知状态
│   │   ├── seal.ts              # 印章状态
│   │   └── watermark.ts         # 水印状态
│   │
│   ├── utils/                   # 工具函数
│   │   ├── format.ts            # 格式化（金额、日期、电话）
│   │   ├── validate.ts          # 校验规则
│   │   ├── export.ts            # 导出工具
│   │   └── constants.ts         # 常量定义
│   │
│   ├── types/                   # TypeScript 类型
│   │   ├── api.ts               # API 响应类型
│   │   ├── models.ts            # 业务模型类型
│   │   └── enums.ts             # 枚举类型
│   │
│   └── middleware/
│       └── auth.ts              # 认证中间件
│
├── server/                      # Nuxt 4 服务端（Nitro）
│   ├── api/                     # API 路由（无 /v1 前缀，Nginx 反代时添加）
│   │   ├── auth/
│   │   ├── users/
│   │   ├── customers/
│   │   ├── opportunities/
│   │   ├── products/
│   │   ├── contracts/
│   │   ├── projects/
│   │   ├── commissions/
│   │   ├── dashboard/
│   │   └── system/
│   ├── database/                # Drizzle ORM
│   │   ├── schema/              # Schema 定义
│   │   ├── migrations/          # 迁移 SQL
│   │   └── index.ts             # 数据库连接
│   ├── utils/
│   │   ├── auth.ts              # JWT 工具
│   │   ├── permission.ts        # 权限检查
│   │   └── ...
│   └── middleware/
│       └── auth.ts              # 服务端认证中间件（含角色权限）
│
├── docs/
│   ├── API.md                   # API 接口文档
│   └── FRONTEND.md              # 本文档
│
├── nuxt.config.ts
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 二、页面路由详细设计

### 2.1 完整路由表

| 路由路径 | 页面组件 | 权限 | 说明 |
|----------|----------|------|------|
| `/auth/login` | auth/login.vue | 公开 | 登录页 |
| `/dashboard` | dashboard/index.vue | 已登录 | 仪表盘 |
| **客户** | | | |
| `/dashboard/customers` | customers/index.vue | 已登录 | 客户列表 |
| `/dashboard/customers/create` | customers/create.vue | 已登录 | 新建客户 |
| `/dashboard/customers/:id` | customers/[id]/index.vue | 已登录 | 客户详情 |
| `/dashboard/customers/:id/edit` | customers/[id]/edit.vue | owner/管理员 | 编辑客户 |
| **商机** | | | |
| `/dashboard/opportunities` | opportunities/index.vue | 已登录 | 商机列表 |
| `/dashboard/opportunities/funnel` | opportunities/funnel.vue | 已登录 | 销售漏斗 |
| `/dashboard/opportunities/create` | opportunities/create.vue | 已登录 | 新建商机 |
| `/dashboard/opportunities/:id` | opportunities/[id]/index.vue | 已登录 | 商机详情 |
| `/dashboard/opportunities/:id/edit` | opportunities/[id]/edit.vue | owner/管理员 | 编辑商机 |
| **产品** | | | |
| `/dashboard/products` | products/index.vue | 已登录 | 产品列表 |
| `/dashboard/products/create` | products/create.vue | 管理员 | 新建产品 |
| `/dashboard/products/:id/edit` | products/[id]/edit.vue | 管理员 | 编辑产品 |
| **合同** | | | |
| `/dashboard/contracts` | contracts/index.vue | 已登录 | 合同列表 |
| `/dashboard/contracts/ledger` | contracts/ledger.vue | 财务/管理员 | 合同台账 |
| `/dashboard/contracts/create` | contracts/create.vue | 已登录 | 新建合同 |
| `/dashboard/contracts/:id` | contracts/[id]/index.vue | 已登录 | 合同详情 |
| `/dashboard/contracts/:id/edit` | contracts/[id]/edit.vue | owner/管理员 | 编辑合同 |
| **项目** | | | |
| `/dashboard/projects` | projects/index.vue | 已登录 | 项目列表 |
| `/dashboard/projects/create` | projects/create.vue | 已登录 | 新建项目 |
| `/dashboard/projects/:id` | projects/[id]/index.vue | 已登录 | 项目详情 |
| `/dashboard/projects/:id/edit` | projects/[id]/edit.vue | owner/管理员 | 编辑项目 |
| **提成** | | | |
| `/dashboard/commissions` | commissions/index.vue | 财务/管理员 | 提成列表 |
| `/dashboard/commissions/rules` | commissions/rules.vue | 管理员 | 提成规则 |
| `/dashboard/commissions/payouts` | commissions/payouts.vue | 财务/管理员 | 提成发放 |
| **系统** | | | |
| `/dashboard/users` | users/index.vue | 管理员 | 用户管理 |
| `/dashboard/settings` | settings/index.vue | 管理员 | 系统设置 |
| `/dashboard/logs` | logs/index.vue | 管理员 | 操作日志 |
| `/profile` | profile/index.vue | 已登录 | 个人中心 |

### 2.2 路由守卫策略

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  // 未登录 → 跳转登录页
  if (!authStore.isAuthenticated && to.path !== '/auth/login') {
    return navigateTo('/auth/login')
  }

  // 已登录访问登录页 → 跳转仪表盘
  if (authStore.isAuthenticated && to.path === '/auth/login') {
    return navigateTo('/dashboard')
  }

  // 权限检查（基于路由 meta）
  const requiredRole = to.meta.role as string | undefined
  if (requiredRole && !authStore.hasRole(requiredRole)) {
    return navigateTo('/dashboard')
  }
})
```

---

## 三、布局设计

### 3.1 Default Layout 结构

```
┌──────────────────────────────────────────────────┐
│  Topbar (64px)                                    │
│  [Logo] [Breadcrumb]          [Notification] [用户] │
├────────┬─────────────────────────────────────────┤
│ Sidebar│  Main Content                            │
│ (220px)│                                          │
│        │  ┌─────────────────────────────────┐     │
│ 仪表盘  │  │ PageHeader                      │     │
│ 客户    │  │ 标题 + 操作按钮                    │     │
│ 商机    │  ├─────────────────────────────────┤     │
│ 产品    │  │ SearchBar + Filter               │     │
│ 合同    │  ├─────────────────────────────────┤     │
│ 项目    │  │ Content Area                     │     │
│ 提成    │  │ (表格/卡片/表单/图表)              │     │
│ ────── │  │                                  │     │
│ 用户    │  │                                  │     │
│ 设置    │  │                                  │     │
│ 日志    │  └─────────────────────────────────┘     │
│        │                                          │
└────────┴─────────────────────────────────────────┘
```

### 3.2 侧边栏导航项

```typescript
// 导航文案：简洁日常，像贴在墙上的便签
// 图标：Heroicons Outline 风格，1.5px 描边，暖色调
const navItems = [
  { label: '首页', icon: 'i-heroicons-home', to: '/dashboard' },
  { label: '客户', icon: 'i-heroicons-users', to: '/dashboard/customers' },
  { label: '商机', icon: 'i-heroicons-flag', to: '/dashboard/opportunities' },
  { label: '产品', icon: 'i-heroicons-tag', to: '/dashboard/products' },
  { label: '合同', icon: 'i-heroicons-document-text', to: '/dashboard/contracts' },
  { label: '项目', icon: 'i-heroicons-folder-open', to: '/dashboard/projects' },
  { label: '提成', icon: 'i-heroicons-banknotes', to: '/dashboard/commissions', role: 'finance,admin,sales_manager' },
  { type: 'divider' },
  { label: '同事', icon: 'i-heroicons-user-group', to: '/dashboard/users', role: 'admin' },
  { label: '设置', icon: 'i-heroicons-cog-6-tooth', to: '/dashboard/settings', role: 'admin' },
  { label: '操作记录', icon: 'i-heroicons-clock', to: '/dashboard/logs', role: 'admin' },
]
```

---

## 四、核心 Composables 设计

### 4.1 useAuth — 认证与权限

```typescript
// composables/useAuth.ts
export function useAuth() {
  const store = useAuthStore()

  return {
    user: computed(() => store.user),
    isAuthenticated: computed(() => store.isAuthenticated),
    login: store.login,
    logout: store.logout,
    refreshToken: store.refreshToken,

    // 权限判断
    hasRole: (role: UserRole | UserRole[]) => { ... },
    canView: (module: string) => { ... },
    canEdit: (module: string, ownerId?: number) => { ... },
    isAdmin: computed(() => store.user?.role === 'admin'),
    isFinance: computed(() => store.user?.role === 'finance'),
    isSalesManager: computed(() => store.user?.role === 'sales_manager'),
  }
}
```

### 4.2 useApi — API 请求封装

```typescript
// composables/useApi.ts
export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const request = async <T>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      body?: any
      params?: Record<string, any>
    } = {}
  ): Promise<T> => {
    // 自动注入 token
    // 自动处理 401 → refresh → retry
    // 自动处理错误提示
    // 返回 data 部分
  }

  return {
    get: <T>(url: string, params?: Record<string, any>) => request<T>(url, { method: 'GET', params }),
    post: <T>(url: string, body?: any) => request<T>(url, { method: 'POST', body }),
    put: <T>(url: string, body?: any) => request<T>(url, { method: 'PUT', body }),
    del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  }
}
```

### 4.3 useTable — 列表通用逻辑

```typescript
// composables/useTable.ts
export function useTable<T>(options: {
  url: string                          // API 端点
  filters?: Record<string, Ref<any>>   // 响应式筛选条件
  defaultSortBy?: string
  defaultSortOrder?: 'asc' | 'desc'
  pageSize?: number
}) {
  const page = ref(1)
  const pageSize = ref(options.pageSize ?? 20)
  const sortBy = ref(options.defaultSortBy ?? 'createdAt')
  const sortOrder = ref(options.defaultSortOrder ?? 'desc')
  const keyword = ref('')
  const loading = ref(false)
  const items = ref<T[]>([])
  const total = ref(0)

  const fetchItems = async () => { ... }   // 自动组装查询参数
  const deleteItem = async (id: number) => { ... }
  const exportItems = async () => { ... }

  // 监听筛选条件变化自动刷新
  watch([page, pageSize, sortBy, sortOrder, keyword, ...Object.values(options.filters ?? {})], fetchItems)

  return { items, total, page, pageSize, sortBy, sortOrder, keyword, loading, fetchItems, deleteItem, exportItems }
}
```

### 4.4 useEnum — 枚举值缓存

```typescript
// composables/useEnum.ts
export function useEnum() {
  const enumCache = useState<Record<string, { value: string; label: string }[]>>('enums', () => ({}))
  const loaded = ref(false)

  const fetchEnums = async () => {
    if (loaded.value) return
    const { data } = await useApi().get('/enums')
    enumCache.value = data
    loaded.value = true
  }

  const getLabel = (type: string, value: string) => {
    return enumCache.value[type]?.find(e => e.value === value)?.label ?? value
  }

  const getOptions = (type: string) => {
    return enumCache.value[type] ?? []
  }

  return { enums: enumCache, fetchEnums, getLabel, getOptions }
}
```

---

## 五、核心通用组件设计

### 5.1 DataTable — 万能数据表格

```vue
<!-- components/common/DataTable.vue -->
<script setup lang="ts">
// Props
interface Props {
  columns: TableColumn[]          // 列定义
  items: any[]                    // 数据
  loading?: boolean               // 加载状态
  total?: number                  // 总条数
  page?: number                   // 当前页
  pageSize?: number               // 每页条数
  selectable?: boolean            // 是否可选
  emptyText?: string              // 空状态文案
}

// Emits: update:page, update:pageSize, sort, row-click, selection-change
</script>
```

**特性**：
- 基于 Nuxt UI `UTable` 封装
- 自动分页
- 列排序
- 行点击跳转
- 复选框多选
- 空状态展示
- 加载骨架屏

### 5.2 FormModal — 表单弹窗

```vue
<!-- components/common/FormModal.vue -->
<script setup lang="ts">
interface Props {
  modelValue: boolean             // v-model 控制显隐
  title: string                   // 弹窗标题
  width?: string                  // 宽度
  loading?: boolean               // 提交中状态
  confirmText?: string            // 确认按钮文案
}

// Emits: update:modelValue, confirm, cancel
</script>
```

**特性**：
- 基于 Nuxt UI `UModal` + `UForm` 封装
- ESC 关闭
- 提交防重复
- 表单校验
- 确认/取消按钮

### 5.3 StatusBadge — 状态标签

```vue
<!-- components/common/StatusBadge.vue -->
<script setup lang="ts">
interface Props {
  type: string                    // 枚举类型（如 'customerStatus'）
  value: string                   // 枚举值
}
</script>
```

**特性**：
- 根据枚举自动匹配中文标签和颜色
- 预定义颜色映射：成功=绿、进行中=蓝、警告=橙、失败=红

### 5.4 SearchBar — 搜索筛选栏

```vue
<!-- components/common/SearchBar.vue -->
<script setup lang="ts">
interface Props {
  keyword?: string                // 搜索关键词
  filters?: FilterConfig[]        // 筛选配置
  showExport?: boolean            // 显示导出按钮
}

interface FilterConfig {
  key: string                     // 参数名
  type: 'select' | 'dateRange' | 'userSelect'
  label: string
  options?: { value: string; label: string }[]
}
</script>
```

---

## 六、页面组件组合模式

### 6.1 列表页标准结构

每个模块的列表页遵循统一的组合模式：

```vue
<!-- pages/dashboard/customers/index.vue -->
<template>
  <div>
    <PageHeader title="客户管理" :actions="headerActions" />

    <SearchBar
      v-model:keyword="keyword"
      :filters="filterConfig"
      show-export
      @export="exportItems"
    />

    <DataTable
      :columns="columns"
      :items="items"
      :loading="loading"
      :total="total"
      v-model:page="page"
      v-model:page-size="pageSize"
      @sort="handleSort"
      @row-click="navigateToDetail"
    />

    <FormModal v-model="showCreateModal" title="新建客户" @confirm="handleCreate">
      <CustomerForm ref="formRef" />
    </FormModal>
  </div>
</template>

<script setup lang="ts">
const { items, total, page, pageSize, keyword, loading, fetchItems, deleteItem, exportItems } =
  useTable<Customer>({
    url: '/api/v1/customers',
    filters: { status, ownerId, industry }
  })

const { getLabel, getOptions } = useEnum()
const { canEdit } = useAuth()
</script>
```

### 6.2 详情页标准结构

```vue
<!-- pages/dashboard/customers/[id]/index.vue -->
<template>
  <div>
    <PageHeader :title="customer.name" :actions="detailActions" />

    <UTabs :items="tabItems">
      <template #basic>
        <CustomerBasicInfo :customer="customer" />
      </template>
      <template #contacts>
        <ContactList :customer-id="customer.id" />
      </template>
      <template #followups>
        <FollowUpList :customer-id="customer.id" />
      </template>
      <template #opportunities>
        <!-- 关联商机列表 -->
      </template>
      <template #contracts>
        <!-- 关联合同列表 -->
      </template>
    </UTabs>
  </div>
</template>
```

### 6.3 表单页标准结构

新建和编辑共用业务组件 `CustomerForm`，通过 prop 区分模式：

```vue
<!-- components/customers/CustomerForm.vue -->
<template>
  <UForm :state="form" :schema="schema" @submit="handleSubmit">
    <UFormField label="客户名称" name="name" required>
      <UInput v-model="form.name" />
    </UFormField>
    <!-- 更多字段 -->
  </UForm>
</template>
```

---

## 七、状态管理

### 7.1 Pinia Store 设计

仅 3 个全局 store，其余数据由 composable 和页面状态管理：

**auth store**
```typescript
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  const login = async (username: string, password: string) => { ... }
  const logout = async () => { ... }
  const refreshAccessToken = async () => { ... }
  const hasRole = (role: UserRole | UserRole[]) => { ... }

  return { user, token, isAuthenticated, login, logout, refreshAccessToken, hasRole }
})
```

**app store**
```typescript
// stores/app.ts
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const systemName = ref('企业管理系统')
  const companyName = ref('')

  const toggleSidebar = () => { sidebarCollapsed.value = !sidebarCollapsed.value }

  return { sidebarCollapsed, systemName, companyName, toggleSidebar }
})
```

**notification store**
```typescript
// stores/notification.ts
export const useNotificationStore = defineStore('notification', () => {
  const unreadCount = ref(0)
  let pollingTimer: ReturnType<typeof setInterval> | null = null

  const fetchUnreadCount = async () => { ... }
  const startPolling = (intervalMs = 30000) => { ... }   // 默认 30 秒轮询
  const stopPolling = () => { ... }

  return { unreadCount, fetchUnreadCount, startPolling, stopPolling }
})
```

---

## 八、工具函数

### 8.1 format.ts

```typescript
// 金额格式化
export function formatAmount(value: number): string
// 12345.67 → '¥12,345.67'

// 日期格式化
export function formatDate(value: string | Date, format?: string): string
// '2024-01-15T10:30:00Z' → '2024-01-15'

// 百分比格式化
export function formatPercent(value: number): string
// 0.1 → '10%'

// 进度条格式化
export function formatProgress(current: number, total: number): string
// formatProgress(3000, 10000) → '30%'
```

### 8.2 validate.ts

```typescript
// 通用校验规则（配合 Zod 使用）
export const rules = {
  required: (msg?: string) => z.string().min(1, msg ?? '此字段为必填'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  email: z.string().email('请输入正确的邮箱'),
  amount: z.number().positive('金额必须大于0'),
}
```

---

## 九、关键页面交互流程

### 9.1 一键转化流程

```
客户详情页
  └→ 点击 "创建商机" → 商机创建页（自动带入客户信息）
       └→ 商机详情页 → 点击 "赢单"
            └→ 自动生成合同草稿 → 跳转合同编辑页
                 └→ 合同详情页 → 点击 "创建项目"
                      └→ 自动生成项目 → 跳转项目详情页
```

### 9.2 跟进提醒流程

```
1. 添加跟进记录时设置 "下次跟进时间"
2. 后端定时任务扫描到期的跟进提醒
3. 写入 notifications 表
4. 前端轮询 /notifications/unread-count
5. 顶栏 NotificationBell 显示红点
6. 点击跳转到对应客户/商机详情
```

### 9.3 合同回款 → 提成自动计算

```
1. 合同详情页登记收款
2. 后端更新 receivedAmount
3. 后端自动触发提成计算
4. 生成提成记录（status=pending）
5. 销售负责人在提成列表看到待审批项
6. 审批通过 → 财务确认 → 发放
```

---

## 十、Nuxt 4 配置要点

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',           // UI 组件库 (v4)
    '@pinia/nuxt',        // 状态管理
  ],

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    aiEncryptionKey: process.env.AI_ENCRYPTION_KEY,
    public: {
      appName: '企业一体化管理系统',
    },
  },

  // Nitro 别名：`#database`、`#schema/*`、`#server-utils`、`#enums`
  nitro: {
    alias: { ... }
  },

  // SQLite 通过 better-sqlite3 直接访问，无需外部数据库服务
})
```
