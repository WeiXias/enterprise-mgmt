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

// 按路由前缀限制角色：仅管理员可访问
const ADMIN_ONLY_PREFIXES = [
  '/api/roles',
  '/api/permissions',
  '/api/departments',
  '/api/system',
  '/api/users',
  '/api/ai',
  '/api/tags',
]

// 仅管理员和财务可访问
const ADMIN_FINANCE_PREFIXES = [
  '/api/commissions',
  '/api/commission-rules',
  '/api/commission-payouts',
  '/api/finance',
]

// 以下路由仅管理员和销售负责人可访问
const ADMIN_MANAGER_PREFIXES = [
  '/api/product-categories',
]

function checkRolePrefix(url: string, payload: any): void {
  const role = payload?.role

  // 管理员拥有所有权限
  if (role === 'admin') return

  // 管理员专属
  if (ADMIN_ONLY_PREFIXES.some(p => url.startsWith(p))) {
    throw createError({ statusCode: 403, statusMessage: '这个需要管理员才能操作' })
  }

  // 管理员 + 财务
  if (ADMIN_FINANCE_PREFIXES.some(p => url.startsWith(p))) {
    if (role !== 'finance') {
      throw createError({ statusCode: 403, statusMessage: '这个需要财务或管理员才能操作' })
    }
  }

  // 管理员 + 销售负责人
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
    checkRolePrefix(url, payload)
  } catch (err: any) {
    // 如果已经抛出了 h3 错误（401/403），直接重新抛出
    if (err?.statusCode) throw err
    throw createError({ statusCode: 401, statusMessage: '登录已过期，请重新登录' })
  }
})
