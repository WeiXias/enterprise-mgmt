import { defineEventHandler } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { requirePermission } from '#server-utils/permission'

const SECURITY_KEYS = ['password_min_length', 'login_max_attempts', 'login_lock_minutes', 'token_expire_hours']

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:manage')
  const list = await db.select().from(systemConfig)
  const config: Record<string, string> = {}
  list.forEach((item: any) => { config[item.key] = item.value })

  const security: Record<string, string> = {
    password_min_length: config.password_min_length || '8',
    login_max_attempts: config.login_max_attempts || '5',
    login_lock_minutes: config.login_lock_minutes || '30',
    token_expire_hours: config.token_expire_hours || '24',
  }
  return { code: 0, data: security }
})
