import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { requirePermission } from '#server-utils/permission'

const SENSITIVE_KEYS = ['smtp_password', 'api_key', 'jwt_secret', 'encryption_key', 'ai_api_key']

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:manage')
  const list = await db.select().from(systemConfig)
  const config: Record<string, string> = {}
  list.forEach((item: any) => {
    if (SENSITIVE_KEYS.some(k => item.key.toLowerCase().includes(k))) {
      config[item.key] = '***'
    } else {
      config[item.key] = item.value
    }
  })
  return { code: 0, data: config }
})
