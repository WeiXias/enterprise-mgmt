import { defineEventHandler, createError, getHeader } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { verifyAccessToken } from '#server-utils/auth'
import { requirePermission } from '#server-utils/permission'

const SENSITIVE_KEYS = ['smtp_password', 'api_key', 'jwt_secret', 'encryption_key', 'ai_api_key']

// 读取公开配置（无需登录）
const PUBLIC_KEYS = ['app_name', 'system_name', 'company_name', 'company_logo', 'sidebar_order', 'allow_register']

export default defineEventHandler(async (event) => {
  // 先尝试读取 token
  await requirePermission(event, 'system:read')
  const authHeader = getHeader(event, 'authorization')
  const isPublicRequest = !authHeader?.startsWith('Bearer ')

  const list = await db.select().from(systemConfig)
  const config: Record<string, string> = {}

  if (isPublicRequest) {
    // 公开模式：只返回公开配置项
    list.forEach((item: any) => {
      if (PUBLIC_KEYS.some(k => k === item.key)) {
        config[item.key] = item.value
      }
    })
  } else {
    // 认证模式：返回完整配置
    const token = authHeader.slice(7)
    try {
      const payload = await verifyAccessToken(token)
      if (!payload?.userId) {
        throw createError({ statusCode: 401, statusMessage: '请先登录' })
      }
      // 非管理员：只读
      list.forEach((item: any) => {
        if (SENSITIVE_KEYS.some(k => item.key.toLowerCase().includes(k))) {
          config[item.key] = '***'
        } else {
          config[item.key] = item.value
        }
      })
    } catch (err: any) {
      throw createError({ statusCode: 401, statusMessage: '请先登录' })
    }
  }

  return { code: 0, data: config }
})
