# 权限体系使用规范

## 架构

三层纵深防御，每层独立运作：

```
API 路由 -> 全局中间件（路由前缀拦截）-> requirePermission（操作级检查）-> 业务数据过滤
```

## 在 API 路由中使用

### 新建 API 路由的标准模板

```typescript
// 1. 导入
import { requirePermission, checkPermission } from '#server-utils/permission'

// 2. handler 第一行做权限检查
export default defineEventHandler(async (event) => {
  // 读操作：检查 read 权限码
  const user = await requirePermission(event, 'customer:read')

  // 写操作：检查对应的 write 权限码
  // await requirePermission(event, 'customer:create')

  // 3. 行级数据过滤：没有 create/edit 权限的用户只能看自己的
  if (!(await checkPermission(event, 'customer:create'))) {
    where.push(eq(customers.ownerUserId, user.userId))
  }
})
```

### 权限码命名规则

所有权限码格式为 `模块:操作`，操作统一使用以下动词：

| 操作 | 说明 | 示例 |
|------|------|------|
| `read` | 查看列表/详情 | `customer:read`, `product:read` |
| `create` | 新增 | `contract:create`, `todo:create` |
| `edit` | 编辑/修改 | `project:edit`, `user:edit` |
| `delete` | 删除 | `attachment:delete` |
| `approve` | 审批通过 | `contract:approve`, `commission:approve` |
| `reject` | 驳回 | `contract:reject` |
| `transfer` | 转移归属 | `customer:transfer` |
| `manage` | 管理配置(含增删改查) | `role:manage`, `system:manage` |
| `config` | 修改配置项 | `system:config` |
| `backup` | 备份操作 | `system:backup` |

### 权限检查函数

| 函数 | 返回值 | 用途 |
|------|--------|------|
| `requirePermission(event, code)` | `AuthUser` | 无权限抛 403，用于操作入口 |
| `checkPermission(event, code)` | `boolean` | 返回 true/false，用于数据过滤、UI 控制 |
| `requireAuth(event)` | `AuthUser` | 仅检查登录态 |

### 权限码与 API 路由的对应关系

| 路由前缀 | 所需权限码 |
|----------|-----------|
| `/api/roles`、`/api/permissions` | `role:manage` |
| `/api/departments` | `department:manage` |
| `/api/system` | `system:manage` |
| `/api/users` | `user:read` |
| `/api/ai` | `ai:manage` |
| `/api/commissions`、`/api/commission-*` | `commission:read` |
| `/api/finance` | `finance:read` |
| `/api/product-categories` | `product-category:edit` |

## 新增权限码流程

1. **在 `server/plugins/perm-seed.ts` 的 `seedPermissions` 数组中追加**
2. **在对应角色的权限列表（`salesMgrCodes`/`salesMemberCodes`/`financeCodes`）中加上新码**
3. **在 API 路由中使用 `requirePermission(event, '新码')`**
4. **删除现有数据库后重新 seed 验证**:
   ```bash
   rm -f data/db/enterprise.db && pnpm seed
   ```

## 前端使用

### 模板中控制 UI 显示

```vue
<script setup>
const { can } = usePermission()
</script>

<template>
  <!-- 按钮显示控制 -->
  <UButton v-if="can('customer:create')" @click="openCreate">新增客户</UButton>

  <!-- 菜单项显示 -->
  <li v-if="can('finance:read')">财务管理</li>

  <!-- 管理员专属 -->
  <li v-if="can('system:manage')">设置</li>
</template>
```

### 脚本中做逻辑控制

```typescript
const { can, canAny } = usePermission()

function handleAction() {
  if (!can('contract:approve')) return
  // 执行审批逻辑
}

// 多权限判断
if (canAny(['customer:transfer', 'customer:edit', 'customer:delete'])) {
  showTransferButton = true
}
```

### 角色 getter（过渡期保留，标记 deprecated）

`authStore` 中的 `isAdmin`/`isSalesManager`/`isFinance` getter 保留可用，但新代码**禁止使用**，全部改用 `usePermission().can()`。

## 角色-权限矩阵速查

| 模块 | admin | sales_manager | sales_member | finance |
|------|-------|---------------|-------------|---------|
| 客户 | 全部 | 全部(含转移) | 读+创建+编辑 | 只读 |
| 商机 | 全部 | 全部(含转移) | 读+创建+编辑 | 只读 |
| 合同 | 全部 | 全部(含审批/转移) | 读+创建 | 只读+审批 |
| 项目 | 全部 | 全部(含模板) | 只读 | 只读 |
| 产品 | 全部 | 全部 | 只读 | 只读 |
| 提成 | 全部 | 只读 | 只读 | 全部 |
| 财务 | 全部 | 只读 | 只读 | 全部(含报销审批) |
| 进销存 | 全部 | 全部 | 只读 | 只读 |
| 待办 | 全部 | 全部 | 全部(仅自己) | 只读 |
| 用户 | 全部 | 只读 | — | 只读 |
| 角色/权限 | 全部 | — | — | — |
| 部门 | 全部 | — | — | — |
| 系统 | 全部 | 管理+配置+备份 | — | 只读 |
| AI | 全部 | 只读 | 只读 | 只读 |

## 注意事项

1. **禁止在服务端代码中写 `user.role === 'xxx'` 做权限判断** — 一律用 `requirePermission`/`checkPermission`
2. **禁止在前端代码中直接读 `authStore.user?.role` 做 UI 控制** — 用 `usePermission().can()`
3. **不新增角色枚举值** — 新增角色在 `roles` 表中创建，通过 `role_permissions` 分配权限码
4. **admin 全权限是通过种子数据实现的** — admin 角色拥有全部 191 个权限码，`requirePermission` 中查 `roles.isSystem` 标记来跳过详细校验
