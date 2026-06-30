import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { notifications } from '#schema/users'
import { eq, and } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'notification:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const existing = await db.select({ id: notifications.id, userId: notifications.userId })
    .from(notifications).where(eq(notifications.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '通知不存在' })
  if (existing[0].userId !== user.userId) throw createError({ statusCode: 403, statusMessage: '这个不是你的通知' })

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id))
  return { code: 0, data: null, message: '已标为已读' }
})
