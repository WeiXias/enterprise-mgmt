import { defineEventHandler } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_from', 'smtp_secure', 'smtp_enabled']

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:manage')
  const list = await db.select().from(systemConfig)
  const config: Record<string, string> = {}
  list.forEach((item: any) => { config[item.key] = item.value })

  const smtp: Record<string, string> = {}
  SMTP_KEYS.forEach(key => { smtp[key] = config[key] || '' })
  return { code: 0, data: smtp }
})
