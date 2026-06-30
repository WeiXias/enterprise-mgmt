import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { notifications } from '#schema/users'
import { eq, and } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'notification:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, user.userId), eq(notifications.isRead, false)))
  return { code: 0, data: null, message: '全部标为已读啦' }
})
