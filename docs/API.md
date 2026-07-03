# API 接口协议文档

> 企业一体化管理系统 — 前后端交互协议

---

## 一、全局规范

### 1.1 Base URL

```
/api          # 本地直连
/api/v1       # Nginx 反向代理加前缀
```

### 1.2 认证方式

| 项目 | 说明 |
|------|------|
| 方式 | JWT Bearer Token |
| Header | `Authorization: Bearer <token>` |
| Token 有效期 | Access Token 2h, Refresh Token 7d |
| 刷新 | POST `/api/v1/auth/refresh` |

### 1.3 统一响应格式

**成功响应**

```typescript
interface ApiResponse<T = any> {
  code: 0              // 0 表示成功
  data: T              // 业务数据
  message: string      // 提示信息（可选）
}
```

**分页响应**

```typescript
interface PaginatedResponse<T = any> {
  code: 0
  data: {
    items: T[]          // 数据列表
    total: number       // 总条数
    page: number        // 当前页码（从1开始）
    pageSize: number    // 每页条数
    totalPages: number  // 总页数
  }
}
```

**错误响应**

```typescript
interface ErrorResponse {
  code: number         // 非零错误码
  message: string      // 错误描述
  details?: any        // 补充信息（如校验错误字段列表）
}
```

### 1.4 错误码规范

| 错误码 | 含义 | 场景 |
|--------|------|------|
| 0 | 成功 | — |
| 401 | 未认证 | Token 缺失/过期 |
| 403 | 无权限 | 角色权限不足 |
| 404 | 资源不存在 | ID 对应记录不存在 |
| 409 | 冲突 | 重复创建（如用户名已存在） |
| 422 | 参数校验失败 | 必填字段缺失、格式错误 |
| 1001 | 客户名重复 | — |
| 1002 | 客户不存在 | — |
| 2001 | 商机状态不可变更 | 已赢单/输单不可回退 |
| 3001 | 产品编码重复 | — |
| 4001 | 合同审批冲突 | 已审批不可驳回至草稿 |
| 4002 | 收款金额超出 | 登记金额 > 合同总额 |
| 5001 | 提成规则冲突 | 同产品存在多条生效规则 |
| 9001 | 编码生成失败 | — |

### 1.5 分页与筛选约定

**分页参数（Query）**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数（max 100） |
| sortBy | string | createdAt | 排序字段 |
| sortOrder | string | desc | asc / desc |

**通用筛选参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| keyword | string | 关键词搜索（模糊匹配名称等） |
| status | string | 状态筛选 |
| ownerId | number | 归属人筛选 |
| startDate | string | 日期范围起始（ISO 8601） |
| endDate | string | 日期范围截止（ISO 8601） |

### 1.6 软删除策略

- 删除接口统一使用 `DELETE /xxx/:id`，执行软删除（设置 `deletedAt`）
- 列表查询默认过滤 `deletedAt IS NULL`
- 管理员可通过 `GET /xxx/:id?withDeleted=true` 查看已删除数据

### 1.7 数据权限

角色权限由服务端认证中间件集中管控，按路由前缀限制：

| 角色 | 权限范围 |
|------|----------|
| 管理员 | 全部数据和系统设置 |
| 销售负责人 | 全部业务数据 + 产品分类管理 |
| 销售成员 | 仅自己负责的数据 |
| 财务 | 合同/提成/回款完整权限，其余只读 |

> 敏感路由（`/api/users/`、`/api/roles/`、`/api/system/` 等）仅管理员可访问。
> 提成与财务路由仅管理员和财务可访问。

---

## 二、认证模块 `/api/v1/auth`

### 2.1 登录

```
POST /auth/login
```

**Request**
```typescript
{
  username: string   // 登录账号
  password: string   // 密码
}
```

**Response**
```typescript
{
  code: 0,
  data: {
    accessToken: string
    refreshToken: string
    expiresIn: number        // 秒
    user: {
      id: number
      username: string
      name: string
      role: UserRole
      avatarUrl: string | null
    }
  }
}
```

### 2.2 登出

```
POST /auth/logout
```

**Headers**: `Authorization: Bearer <token>`

**Response**
```typescript
{ code: 0, data: null, message: "已登出" }
```

### 2.3 刷新 Token

```
POST /auth/refresh
```

**Request**
```typescript
{
  refreshToken: string
}
```

**Response**
```typescript
{
  code: 0,
  data: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}
```

### 2.4 修改密码

```
PUT /auth/password
```

**Request**
```typescript
{
  oldPassword: string
  newPassword: string
  confirmPassword: string
}
```

**Response**
```typescript
{ code: 0, data: null, message: "密码修改成功" }
```

---

## 三、账户管理模块 `/api/v1/users`

### 3.1 用户列表

```
GET /users
```

**Query**: `page, pageSize, keyword, role, isActive`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    username: string
    name: string
    phone: string | null
    email: string | null
    role: UserRole
    isActive: boolean
    avatarUrl: string | null
    lastLoginAt: string | null
    createdAt: string
  }]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

### 3.2 创建用户

```
POST /users
```

**Request**
```typescript
{
  username: string       // 3-50字符
  password: string       // 8-50字符
  name: string           // 1-100字符
  phone?: string
  email?: string
  role: UserRole
}
```

**Response**: `ApiResponse<User>`

### 3.3 更新用户

```
PUT /users/:id
```

**Request**
```typescript
{
  name?: string
  phone?: string
  email?: string
  role?: UserRole
  isActive?: boolean
}
```

**Response**: `ApiResponse<User>`

### 3.4 重置密码

```
PUT /users/:id/reset-password
```

**Request**
```typescript
{
  newPassword: string
}
```

### 3.5 个人中心

```
GET /users/me            // 获取当前用户信息
PUT /users/me            // 更新个人信息（name, phone, email, avatarUrl）
PUT /users/me/avatar     // 上传头像（multipart/form-data）
```

### 3.6 通知列表

```
GET /notifications                    // 分页列表
PUT /notifications/:id/read           // 标记已读
PUT /notifications/read-all           // 全部已读
GET /notifications/unread-count       // 未读数量
```

---

## 四、客户管理模块 `/api/v1/customers`

### 4.1 客户列表

```
GET /customers
```

**Query**: `page, pageSize, keyword, status, ownerId, industry, tagIds`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    name: string
    industry: string | null
    phone: string | null
    email: string | null
    status: CustomerStatus
    owner: { id: number; name: string }
    tags: { id: number; name: string; color: string }[]
    lastFollowUpAt: string | null      // 最近跟进时间
    contactCount: number               // 联系人数量
    opportunityCount: number           // 商机数量
    contractCount: number              // 合同数量
    createdAt: string
    updatedAt: string
  }]
}
```

### 4.2 客户详情

```
GET /customers/:id
```

**Response**
```typescript
{
  code: 0,
  data: {
    id: number
    name: string
    industry: string | null
    address: string | null
    phone: string | null
    email: string | null
    description: string | null
    source: string | null
    status: CustomerStatus
    owner: { id: number; name: string }
    tags: { id: number; name: string; color: string }[]
    contacts: Contact[]
    latestFollowUps: FollowUp[]         // 最近5条跟进
    opportunities: OpportunitySummary[] // 关联商机摘要
    contracts: ContractSummary[]        // 关联合同摘要
    createdAt: string
    updatedAt: string
  }
}
```

### 4.3 创建客户

```
POST /customers
```

**Request**
```typescript
{
  name: string             // 必填，1-200字符
  industry?: string
  address?: string
  phone?: string
  email?: string
  description?: string
  source?: string
  ownerId?: number         // 默认为当前用户
  tagIds?: number[]        // 标签ID列表
}
```

### 4.4 更新客户

```
PUT /customers/:id
```

同创建字段（全部可选），另加：

```typescript
{
  status?: CustomerStatus   // 状态变更
}
```

### 4.5 删除客户

```
DELETE /customers/:id
```

软删除，关联商机/合同不影响。

### 4.6 客户转移

```
POST /customers/:id/transfer
```

**Request**
```typescript
{
  toUserId: number      // 新归属人
  reason?: string
}
```

### 4.7 客户标签

```
GET /tags                          // 标签列表
POST /tags                         // 创建标签 { name, color }
PUT /tags/:id                      // 更新标签
DELETE /tags/:id                   // 删除标签
POST /customers/:id/tags           // 给客户打标签 { tagIds: number[] }
DELETE /customers/:id/tags/:tagId  // 移除标签
```

### 4.8 联系人

```
POST /customers/:id/contacts       // 添加联系人
PUT /contacts/:id                  // 更新联系人
DELETE /contacts/:id               // 删除联系人
PUT /contacts/:id/primary          // 设为主要联系人
```

**Contact 结构**
```typescript
{
  id: number
  name: string
  phone?: string
  email?: string
  position?: string
  wechat?: string
  isPrimary: boolean
  remark?: string
}
```

### 4.9 跟进记录

```
GET /customers/:id/follow-ups      // 跟进列表（分页）
POST /customers/:id/follow-ups     // 添加跟进
PUT /follow-ups/:id                // 更新跟进
DELETE /follow-ups/:id             // 删除跟进
```

**FollowUp 结构**
```typescript
{
  id: number
  customerId: number
  opportunityId?: number
  type: FollowUpType              // phone | visit | wechat | email | other
  content: string
  nextFollowUpAt?: string         // 下次跟进时间
  user: { id: number; name: string }
  createdAt: string
}
```

### 4.10 客户统计

```
GET /customers/stats
```

**Response**
```typescript
{
  code: 0,
  data: {
    total: number
    byStatus: Record<CustomerStatus, number>     // 按状态
    byOwner: { ownerId: number; name: string; count: number }[]  // 按归属
    byIndustry: { industry: string; count: number }[]            // 按行业
    lostReasons: { reason: string; count: number }[]             // 流失原因
  }
}
```

---

## 五、商机管理模块 `/api/v1/opportunities`

### 5.1 商机列表

```
GET /opportunities
```

**Query**: `page, pageSize, keyword, status, customerId, ownerId, startDate, endDate`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    name: string
    customer: { id: number; name: string }
    owner: { id: number; name: string }
    amount: number
    expectedCloseDate: string | null
    status: OpportunityStatus
    productCount: number
    createdAt: string
    updatedAt: string
  }]
}
```

### 5.2 商机详情

```
GET /opportunities/:id
```

**Response**
```typescript
{
  code: 0,
  data: {
    id: number
    name: string
    customer: { id: number; name: string }
    owner: { id: number; name: string }
    amount: number
    expectedCloseDate: string | null
    source: string | null
    competitor: string | null
    status: OpportunityStatus
    winReason: string | null
    lostReason: string | null
    products: OpportunityProduct[]    // 关联产品
    quotes: QuoteSummary[]           // 关联报价
    followUps: FollowUp[]            // 跟进记录
    contract: ContractSummary | null // 赢单后生成的合同
    createdAt: string
    updatedAt: string
  }
}
```

### 5.3 创建商机

```
POST /opportunities
```

**Request**
```typescript
{
  name: string
  customerId: number                // 必填
  ownerId?: number                  // 默认当前用户
  amount?: number
  expectedCloseDate?: string
  source?: string
  competitor?: string
  products?: {
    productId: number
    quantity: number
    unitPrice?: number              // 默认取产品标准售价
    discount?: number               // 默认 1.0
  }[]
}
```

### 5.4 从客户快速创建

```
POST /customers/:id/opportunities
```

自动带入 `customerId`，其余同 5.3。

### 5.5 更新商机

```
PUT /opportunities/:id
```

同创建字段（全部可选），不可修改 `customerId`。

### 5.6 赢单/输单

```
POST /opportunities/:id/win
POST /opportunities/:id/lose
```

**Win Request**
```typescript
{
  winReason?: string
  generateContract?: boolean        // 是否自动生成合同草稿，默认 true
}
```

**Win Response** — 额外返回生成的合同ID：
```typescript
{
  code: 0,
  data: {
    opportunity: Opportunity
    contractId?: number             // 自动生成的合同ID
  }
}
```

**Lose Request**
```typescript
{
  lostReason: string                // 必填
}
```

> 赢单后客户状态自动变为 `closed`，输单后不可恢复。

### 5.7 销售漏斗

```
GET /opportunities/funnel
```

**Response**
```typescript
{
  code: 0,
  data: {
    stages: [{
      status: OpportunityStatus
      label: string                 // 阶段中文名
      count: number                 // 商机数量
      totalAmount: number           // 金额合计
    }]
    total: number
    totalAmount: number
    winRate: number                  // 赢单率
  }
}
```

### 5.8 商机统计

```
GET /opportunities/stats
```

**Query**: `startDate, endDate, groupBy=month|quarter|year`

**Response**
```typescript
{
  code: 0,
  data: {
    total: number
    wonCount: number
    lostCount: number
    winRate: number
    avgDealAmount: number
    byMonth: { month: string; created: number; won: number; amount: number }[]
  }
}
```

### 5.9 报价单

```
POST /opportunities/:id/quotes          // 创建报价
GET /opportunities/:id/quotes           // 报价列表
GET /quotes/:id                         // 报价详情
PUT /quotes/:id                         // 更新报价
POST /quotes/:id/export-pdf             // 导出PDF
```

**Quote 结构**
```typescript
{
  id: number
  quoteNo: string
  opportunityId: number
  items: {
    productId: number
    productName: string
    quantity: number
    unitPrice: number
    discount: number
    subtotal: number
  }[]
  totalAmount: number
  discountAmount: number
  finalAmount: number
  validUntil: string | null
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  pdfUrl: string | null
  createdAt: string
}
```

**导出 PDF Response**
```typescript
{
  code: 0,
  data: {
    pdfUrl: string     // PDF 文件下载地址
  }
}
```

---

## 六、产品管理模块 `/api/v1/products`

### 6.1 产品列表

```
GET /products
```

**Query**: `page, pageSize, keyword, categoryId, status`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    name: string
    code: string
    category: { id: number; name: string } | null
    price: number
    cost: number | null
    status: ProductStatus
    quoteCount: number               // 被报价次数
    contractCount: number            // 被合同引用次数
    createdAt: string
  }]
}
```

### 6.2 产品 CRUD

```
POST /products                        // 创建
GET /products/:id                     // 详情
PUT /products/:id                     // 更新
DELETE /products/:id                  // 软删除（下架）
POST /products/:id/toggle-status      // 在售/下架切换
```

**Product Request**
```typescript
{
  name: string
  code: string                        // 唯一编码
  categoryId?: number
  price: number                       // 标准售价
  cost?: number                       // 成本价
  description?: string
}
```

### 6.3 产品分类

```
GET /product-categories               // 分类列表（树形）
POST /product-categories              // 创建
PUT /product-categories/:id           // 更新
DELETE /product-categories/:id        // 删除
```

**Category 树形响应**
```typescript
[{
  id: number
  name: string
  parentId: number | null
  productCount: number
  children?: Category[]
}]
```

### 6.4 批量导入

```
POST /products/import
```

**Request**: `multipart/form-data`，上传 Excel 文件

**Response**
```typescript
{
  code: 0,
  data: {
    total: number           // 总行数
    success: number         // 成功导入
    failed: number          // 失败行数
    errors: {               // 失败明细
      row: number
      reason: string
    }[]
  }
}
```

### 6.5 产品统计

```
GET /products/stats
```

**Response**
```typescript
{
  code: 0,
  data: {
    byProduct: {
      productId: number
      productName: string
      salesCount: number
      salesAmount: number
      grossProfit: number
    }[]
  }
}
```

---

## 七、合同管理模块 `/api/v1/contracts`

### 7.1 合同列表

```
GET /contracts
```

**Query**: `page, pageSize, keyword, status, customerId, startDate, endDate, hasOverduePayment`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    contractNo: string
    name: string
    customer: { id: number; name: string }
    totalAmount: number
    receivedAmount: number
    paymentProgress: number           // 回款进度 0-100
    status: ContractStatus
    startDate: string | null
    endDate: string | null
    hasOverduePayment: boolean        // 是否有逾期未收款
    createdAt: string
  }]
}
```

### 7.2 合同详情

```
GET /contracts/:id
```

**Response**
```typescript
{
  code: 0,
  data: {
    id: number
    contractNo: string
    name: string
    customer: { id: number; name: string }
    opportunity: { id: number; name: string } | null
    totalAmount: number
    receivedAmount: number
    paymentTerms: string | null
    startDate: string | null
    endDate: string | null
    signDate: string | null
    status: ContractStatus
    terms: string | null
    products: ContractProduct[]
    paymentPlans: PaymentPlan[]
    payments: Payment[]
    attachments: Attachment[]
    projects: ProjectSummary[]
    commissions: CommissionSummary[]
    createdAt: string
    updatedAt: string
  }
}
```

### 7.3 创建合同

```
POST /contracts
```

**Request**
```typescript
{
  name: string
  customerId: number
  opportunityId?: number
  totalAmount: number
  paymentTerms?: string
  startDate?: string
  endDate?: string
  signDate?: string
  terms?: string
  products?: {
    productId: number
    quantity: number
    unitPrice: number
    discount?: number
  }[]
  paymentPlans?: {
    planAmount: number
    planDate: string
    remark?: string
  }[]
}
```

### 7.4 从商机生成

```
POST /opportunities/:id/contract
```

自动带入客户、产品、金额，生成合同草稿。

### 7.5 更新合同

```
PUT /contracts/:id
```

> 草稿状态可修改全部字段；已审批后仅可修改部分字段（付款条款等）。

### 7.6 合同审批

```
POST /contracts/:id/approve          // 审批通过
POST /contracts/:id/reject           // 审批驳回
```

**Reject Request**
```typescript
{
  reason: string                     // 驳回原因（必填）
}
```

**审批状态流转**：
```
草稿(draft) → 已审批(approved) → 执行中(in_progress) → 已完成(completed)
  ↑                ↓
  └── 驳回(reject回到draft)
```

### 7.7 收付款管理

```
GET /contracts/:id/payment-plans               // 收款计划列表
POST /contracts/:id/payment-plans               // 添加收款计划
PUT /payment-plans/:id                          // 更新收款计划
DELETE /payment-plans/:id                       // 删除收款计划

POST /contracts/:id/payments                    // 登记收款
GET /contracts/:id/payments                     // 收款记录列表
PUT /payments/:id                               // 更新收款记录
DELETE /payments/:id                            // 删除收款记录
```

**Payment Request**
```typescript
{
  paymentPlanId?: number           // 关联收款计划（可选）
  amount: number                   // 收款金额
  paymentDate: string              // 收款日期
  method?: PaymentMethod
  receiptNo?: string
  remark?: string
}
```

> 登记收款后，自动更新 `contracts.receivedAmount` 和 `paymentPlans.actualAmount`。

### 7.8 合同附件

```
POST /contracts/:id/attachments       // 上传附件（multipart, ≤20MB）
GET /contracts/:id/attachments        // 附件列表
DELETE /attachments/:id               // 删除附件
```

### 7.9 合同台账

```
GET /contracts/ledger
```

**Query**: `page, pageSize, keyword, status, startDate, endDate`

**Response** — 简化的合同列表，侧重财务信息：
```typescript
{
  items: [{
    contractNo: string
    name: string
    customer: string
    totalAmount: number
    receivedAmount: number
    unreceivedAmount: number
    paymentProgress: number
    nextPaymentDate: string | null
    nextPaymentAmount: number | null
    status: ContractStatus
  }]
}
```

### 7.10 回款统计

```
GET /contracts/payment-stats
```

**Query**: `startDate, endDate, groupBy=month|quarter|year`

**Response**
```typescript
{
  code: 0,
  data: {
    totalContractAmount: number
    totalReceivedAmount: number
    totalUnreceivedAmount: number
    overdueAmount: number
    byMonth: { month: string; contracted: number; received: number; overdue: number }[]
  }
}
```

---

## 八、项目管理模块 `/api/v1/projects`

### 8.1 项目列表

```
GET /projects
```

**Query**: `page, pageSize, keyword, status, ownerId, contractId`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    name: string
    contract: { id: number; contractNo: string; name: string } | null
    owner: { id: number; name: string }
    status: ProjectStatus
    progress: number                   // 0-100
    startDate: string | null
    endDate: string | null
    taskStats: {
      total: number
      completed: number
      inProgress: number
      overdue: number
    }
    createdAt: string
  }]
}
```

### 8.2 项目详情

```
GET /projects/:id
```

**Response**
```typescript
{
  code: 0,
  data: {
    id: number
    name: string
    contract: ContractSummary | null
    owner: { id: number; name: string }
    members: { id: number; name: string; role: string }[]
    budget: number | null
    description: string | null
    status: ProjectStatus
    progress: number
    startDate: string | null
    endDate: string | null
    tasks: Task[]
    deliverables: Deliverable[]
    createdAt: string
    updatedAt: string
  }
}
```

### 8.3 创建项目

```
POST /projects
```

**Request**
```typescript
{
  name: string
  contractId?: number
  ownerId?: number                // 默认当前用户
  budget?: number
  description?: string
  startDate?: string
  endDate?: string
  members?: {
    userId: number
    role: 'owner' | 'member'
  }[]
}
```

### 8.4 从合同生成

```
POST /contracts/:id/project
```

自动带入合同信息。

### 8.5 更新项目

```
PUT /projects/:id
```

### 8.6 项目成员

```
POST /projects/:id/members          // 添加成员 { userId, role }
DELETE /projects/:id/members/:userId // 移除成员
PUT /projects/:id/members/:userId   // 更新角色 { role }
```

### 8.7 任务管理

```
GET /projects/:id/tasks             // 任务列表
POST /projects/:id/tasks            // 创建任务
PUT /tasks/:id                      // 更新任务
DELETE /tasks/:id                   // 删除任务
PUT /tasks/:id/status               // 更新任务状态 { status }
PUT /tasks/reorder                  // 批量调整排序 { items: [{ id, sortOrder }] }
```

**Task 结构**
```typescript
{
  id: number
  projectId: number
  title: string
  description: string | null
  assignee: { id: number; name: string } | null
  priority: TaskPriority
  status: TaskStatus
  startDate: string | null
  dueDate: string | null
  completedAt: string | null
  sortOrder: number
  createdAt: string
}
```

### 8.8 甘特图数据

```
GET /projects/:id/gantt
```

**Response**
```typescript
{
  code: 0,
  data: {
    project: { startDate: string; endDate: string }
    tasks: {
      id: number
      title: string
      assignee: string | null
      startDate: string | null
      endDate: string | null
      progress: number           // 0-100
      status: TaskStatus
      dependencies: number[]     // 依赖的任务ID
    }[]
  }
}
```

### 8.9 交付物

```
GET /projects/:id/deliverables       // 交付物列表
POST /projects/:id/deliverables      // 添加交付物 { name, description? }
POST /deliverables/:id/upload        // 上传交付物文件（multipart）
PUT /deliverables/:id/status         // 更新状态 { status: 'submitted'|'accepted'|'rejected' }
```

---

## 九、提成管理模块 `/api/v1/commissions`

### 9.1 提成规则

```
GET /commission-rules                // 规则列表
POST /commission-rules               // 创建规则
PUT /commission-rules/:id            // 更新规则
DELETE /commission-rules/:id         // 删除规则
```

**CommissionRule 结构**
```typescript
{
  id: number
  name: string
  baseType: 'contract_amount' | 'received_amount'   // 提成基数
  rate: number                      // 提成比例 0-1
  productId: number | null          // 特定产品（null=通用）
  minAmount: number | null          // 阶梯下限
  maxAmount: number | null          // 阶梯上限
  isActive: boolean
  priority: number
}
```

### 9.2 提成计算

```
POST /commissions/calculate
```

**Request**
```typescript
{
  contractId: number                 // 合同ID
  paymentId?: number                 // 收款记录ID（按回款计算时必传）
}
```

**Response**
```typescript
{
  code: 0,
  data: {
    results: {
      userId: number
      userName: string
      ruleId: number
      ruleName: string
      baseAmount: number
      rate: number
      amount: number
    }[]
  }
}
```

> 计算后自动生成提成记录，状态为 `pending`。

### 9.3 提成列表

```
GET /commissions
```

**Query**: `page, pageSize, userId, contractId, status, startDate, endDate`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    user: { id: number; name: string }
    contract: { id: number; contractNo: string; name: string }
    baseAmount: number
    rate: number
    amount: number
    adjustedAmount: number | null
    status: CommissionStatus
    createdAt: string
  }]
}
```

### 9.4 提成审批

```
POST /commissions/:id/approve        // 审批通过
POST /commissions/:id/reject         // 驳回 { reason }
PUT /commissions/:id/adjust          // 手动调整 { adjustedAmount, adjustReason }
```

### 9.5 提成发放

```
POST /commission-payouts             // 创建发放单
GET /commission-payouts              // 发放单列表
GET /commission-payouts/:id          // 发放单详情
POST /commission-payouts/:id/confirm // 确认发放
```

**创建发放单 Request**
```typescript
{
  commissionIds: number[]            // 提成记录ID列表
  payoutDate: string
}
```

### 9.6 提成统计

```
GET /commissions/stats
```

**Query**: `startDate, endDate, groupBy=month|user`

**Response**
```typescript
{
  code: 0,
  data: {
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    byUser: { userId: number; name: string; total: number; paid: number; pending: number }[]
    byMonth: { month: string; total: number; paid: number }[]
  }
}
```

---

## 十、系统与看板模块

### 10.1 系统配置

```
GET /system/config                   // 获取全部配置
PUT /system/config/:key              // 更新配置项 { value }
```

**预定义配置项**：

| key | 说明 | 类型 |
|-----|------|------|
| company_name | 公司名称 | string |
| company_logo | 公司Logo URL | string |
| system_name | 系统名称 | string |

### 10.2 编码规则

```
GET /system/code-rules                // 编码规则列表
PUT /system/code-rules/:module        // 更新模块编码规则
POST /system/code-rules/:module/preview  // 预览下一个编号
```

**CodeRule 结构**
```typescript
{
  module: string           // customer | contract | project | quote
  prefix: string           // 前缀
  digits: number           // 序号位数
  separator: string        // 分隔符
  dateFormat: string | null  // 日期格式
  nextCode: string         // 预览下一个编号
}
```

### 10.3 数据备份

```
POST /system/backup                   // 手动备份
GET /system/backups                   // 备份记录列表
GET /system/backups/:id/download      // 下载备份文件
POST /system/backups/:id/restore      // 恢复备份
```

### 10.4 操作日志

```
GET /system/operation-logs
```

**Query**: `page, pageSize, userId, module, action, startDate, endDate`

**Response** (PaginatedResponse)
```typescript
{
  items: [{
    id: number
    user: { id: number; name: string } | null
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
    module: string
    recordId: number | null
    detail: any                      // 变更详情
    ipAddress: string | null
    createdAt: string
  }]
}
```

### 10.5 仪表盘

```
GET /dashboard
```

**Response**
```typescript
{
  code: 0,
  data: {
    todayReminders: {
      followUps: number              // 待跟进
      expiringContracts: number      // 合同即将到期
      overduePayments: number        // 逾期未收款
      dueTasks: number               // 即将到期任务
    }
    kpi: {
      customerTotal: number
      opportunityInProgress: number
      contractAmountThisMonth: number
      receivedAmountThisMonth: number
    }
    recentActivities: {              // 最近20条动态
      id: number
      type: string
      description: string
      user: string
      createdAt: string
    }[]
    funnelData: FunnelData           // 销售漏斗
    paymentTrend: {                  // 近6个月回款趋势
      month: string
      contracted: number
      received: number
    }[]
  }
}
```

### 10.6 Excel 导出

```
GET /customers/export                // 导出客户列表
GET /contracts/export                // 导出合同台账
GET /commissions/export              // 导出提成明细
GET /opportunities/export            // 导出商机列表
```

**Query**: 同各模块列表的筛选参数

**Response**: 文件流，`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## 十一、枚举值查询

```
GET /enums
```

**Response**
```typescript
{
  code: 0,
  data: {
    userRoles: { value: string; label: string }[]
    customerStatus: { value: string; label: string }[]
    opportunityStatus: { value: string; label: string }[]
    contractStatus: { value: string; label: string }[]
    projectStatus: { value: string; label: string }[]
    taskStatus: { value: string; label: string }[]
    taskPriority: { value: string; label: string }[]
    productStatus: { value: string; label: string }[]
    commissionStatus: { value: string; label: string }[]
    followUpType: { value: string; label: string }[]
    paymentMethod: { value: string; label: string }[]
  }
}
```

> 前端启动时调用一次，缓存到 store，用于下拉框、标签、筛选等场景。

---

## 十二、接口总览

| 模块 | 接口数 | 主要端点 |
|------|--------|----------|
| 附件 | 1 | delete |
| 认证 | 5 | login, logout, refresh, password, register |
| 评论 | 2 | delete, update |
| 提成发放 | 3 | list, create, confirm |
| 提成规则 | 4 | CRUD |
| 提成 | 9 | list, calculate, approve, reject, adjust, export, stats |
| 联系人 | 3 | delete, update, primary |
| 合同 | 36 | CRUD, approve/reject, payments, plans, ledger, project, export, transfer |
| 客户 | 15 | CRUD, transfer, tags, contacts, follow-ups, stats, export |
| 看板 | 1 | dashboard |
| 交付物 | 2 | status, upload |
| 部门 | 6 | CRUD, users |
| 数据字典 | 3 | get, put, types |
| 文件 | 2 | preview, logo |
| 财务 | 21 | transactions CRUD, categories CRUD, reimbursements CRUD+approve/reject/pay, reports, settings |
| 跟进 | 2 | delete, update |
| 进销存 | 4 | transactions CRUD |
| 发票 | 5 | CRUD, void |
| 里程碑 | 2 | delete, update |
| 通知 | 4 | list, read, read-all, unread-count |
| 商机 | 13 | CRUD, win/lose, quotes, funnel, stats, export |
| 付款计划 | 3 | CRUD |
| 付款 | 3 | CRUD |
| 权限 | 2 | list, me |
| 产品分类 | 4 | CRUD |
| 产品 | 8 | CRUD, toggle, transactions, stats |
| 项目 | 29 | CRUD, members, tasks, milestones, deliverables, time-logs, risks, comments, gantt, burndown, templates |
| 报价 | 5 | CRUD, export-pdf, send |
| 风险 | 2 | delete, update |
| 角色 | 6 | CRUD, permissions |
| 系统 | 21 | config, code-rules, backups, security, smtp, logs, cron, sidebar |
| 标签 | 4 | CRUD |
| 任务 | 10 | CRUD, comments, dependencies, batch, reorder |
| 工时 | 2 | delete, update |
| 待办 | 21 | CRUD, subtasks, lists, tags, batch, reorder |
| 用户 | 8 | CRUD, me, reset-password |
| **合计** | **273** | |
