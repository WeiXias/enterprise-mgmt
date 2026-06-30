import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { systemConfig } from '#schema/system'
import { like } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'ai:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const rows = await db.select().from(systemConfig)
    .where(like(systemConfig.key, 'ai_%'))

  const config: Record<string, string> = {}
  for (const row of rows) {
    config[row.key] = row.value
  }

  return {
    code: 0,
    data: {
      autoReviewEnabled: config.ai_auto_review_enabled === 'true',
      defaultProviderId: config.ai_default_provider || null,
    },
  }
})
