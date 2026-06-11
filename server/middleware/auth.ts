import { defineEventHandler, sendRedirect, createError, getHeader, getQuery } from 'h3'

// 不需要认证的公共路由
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/enums',
  '/api/system/config',
  '/api/files/logo',
  '/api/health',
]

const PUBLIC_API_PREFIXES = [
  '/api/auth/',
  '/api/_nuxt',  // Nuxt 内部 API（图标数据等）
]

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
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || (getQuery(event)?.token as string)
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
  } catch {
    throw createError({ statusCode: 401, statusMessage: '登录已过期，请重新登录' })
  }
})
