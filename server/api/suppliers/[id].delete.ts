import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { suppliers } from '#schema'
import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'supplier:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(suppliers).set({ deletedAt: now }).where(eq(suppliers.id, id))
  return { code: 0, data: null, message: '已删除' }
})
