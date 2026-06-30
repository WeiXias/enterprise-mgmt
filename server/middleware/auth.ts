import { defineEventHandler, createError, getHeader } from 'h3'
import { eq } from 'drizzle-orm'

// 不需要认证的公共路由
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/config',
  '/api/enums',
  '/api/files/logo',
  '/api/health',
  '/api/system/config',
  '/api/system/version',
]

const PUBLIC_API_PREFIXES = [
  '/api/_nuxt',       // Nuxt 内部 API（图标数据等）
  '/api/_nuxt_icon',  // Nuxt 图标 API
]

// 按路由前缀限制角色：需要对应权限码
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/api/roles': 'role:manage',
  '/api/permissions': 'role:manage',
  '/api/departments': 'department:manage',
  '/api/system': 'system:manage',
  '/api/users': 'user:read',
  '/api/ai': 'ai:manage',
  '/api/tags': 'tag:manage',
  '/api/commissions': 'commission:read',
  '/api/commission-rules': 'commission-rule:read',
  '/api/commission-payouts': 'commission-payout:read',
  '/api/finance': 'finance:read',
  '/api/product-categories': 'product-category:edit',
}

async function checkRoutePermission(url: string, payload: any): Promise<void> {
  // 如果没有 roleId，回退到旧的硬编码 role 判断
  if (!payload?.roleId) {
    checkRolePrefixFallback(url, payload)
    return
  }

  const match = Object.entries(ROUTE_PERMISSION_MAP).find(([prefix]) => url.startsWith(prefix))
  if (!match) return

  const requiredCode = match[1]
  try {
    const { db: permDb } = await import('#database')
    const { users: permUsers, rolePermissions: permRolePerms, permissions: permPerms, roles: permRoles } = await import('#schema')
    const { eq: permEq } = await import('drizzle-orm')

    // 系统 admin 角色直接放行
    const roleRows = await permDb.select({ code: permRoles.code, isSystem: permRoles.isSystem })
      .from(permRoles).where(permEq(permRoles.id, payload.roleId)).limit(1)
    if (roleRows[0]?.code === 'admin' && roleRows[0]?.isSystem) return

    // 查用户角色权限
    const result = await permDb.select({ code: permPerms.code })
      .from(permRolePerms)
      .innerJoin(permPerms, permEq(permRolePerms.permissionId, permPerms.id))
      .where(permEq(permRolePerms.roleId, payload.roleId))

    const codes = result.map((r: any) => r.code)
    if (!codes.includes(requiredCode)) {
      throw createError({ statusCode: 403, statusMessage: '这个需要权限才能操作' })
    }
  } catch (e: any) {
    if (e.statusCode) throw e
    throw createError({ statusCode: 403, statusMessage: '这个需要权限才能操作' })
  }
}

// 旧版硬编码角色判断（无 roleId 时的后备）
function checkRolePrefixFallback(url: string, payload: any): void {
  const role = payload?.role
  if (role === 'admin') return

  const ADMIN_ONLY_PREFIXES = ['/api/roles', '/api/permissions', '/api/departments', '/api/system', '/api/users', '/api/ai', '/api/tags']
  const ADMIN_FINANCE_PREFIXES = ['/api/commissions', '/api/commission-rules', '/api/commission-payouts', '/api/finance']
  const ADMIN_MANAGER_PREFIXES = ['/api/product-categories']

  if (ADMIN_ONLY_PREFIXES.some(p => url.startsWith(p))) {
    throw createError({ statusCode: 403, statusMessage: '这个需要管理员才能操作' })
  }
  if (ADMIN_FINANCE_PREFIXES.some(p => url.startsWith(p))) {
    if (role !== 'finance') {
      throw createError({ statusCode: 403, statusMessage: '这个需要财务或管理员才能操作' })
    }
  }
  if (ADMIN_MANAGER_PREFIXES.some(p => url.startsWith(p))) {
    if (role !== 'sales_manager') {
      throw createError({ statusCode: 403, statusMessage: '这个需要销售负责人或管理员才能操作' })
    }
  }
}

export default defineEventHandler(async (event) => {
  const url = event.path || ''

  // 静态资源跳过
  if (url.startsWith('/_nuxt') || url.startsWith('/__nuxt') || url.match(/\.(css|js|ico|png|jpg|svg|woff2?|json|map|ttf|eot)$/)) {
    return
  }

  // 公共 API 路由跳过认证
  if (PUBLIC_API_ROUTES.includes(url)) return
  if (PUBLIC_API_PREFIXES.some(p => url.startsWith(p))) return

  // 非 API 路由（页面路由）跳过，让前端路由处理
  if (!url.startsWith('/api/')) return

  // API 路由需要认证
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }

  try {
    const { verifyAccessToken } = await import('#server-utils/auth')
    const payload = await verifyAccessToken(token)
    if (!payload?.userId) {
      throw createError({ statusCode: 401, statusMessage: '登录已过期，请重新登录' })
    }
    event.context.user = payload

    // token 版本号校验：登出后旧 token 自动失效
    if (payload.tokenVersion !== undefined) {
      const { db: authDb } = await import('#database')
      const { users: authUsers } = await import('#schema')
      const userRows = await authDb.select({ tokenVersion: authUsers.tokenVersion }).from(authUsers).where(eq(authUsers.id, payload.userId)).limit(1)
      if (userRows[0] && payload.tokenVersion !== userRows[0].tokenVersion) {
        throw createError({ statusCode: 401, statusMessage: '登录已过期，请重新登录' })
      }
    }

    // 角色权限检查
    await checkRoutePermission(url, payload)
  } catch (err: any) {
    // 如果已经抛出了 h3 错误（401/403），直接重新抛出
    if (err?.statusCode) throw err
    throw createError({ statusCode: 401, statusMessage: '登录已过期，请重新登录' })
  }
})
