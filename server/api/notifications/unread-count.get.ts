import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { notifications } from '#schema/users'
import { eq, and, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'notification:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const result = await db.select({ count: sql`count(*)` }).from(notifications)
    .where(and(eq(notifications.userId, user.userId), eq(notifications.isRead, false)))
  return { code: 0, data: { count: Number(result[0]?.count || 0) } }
})
