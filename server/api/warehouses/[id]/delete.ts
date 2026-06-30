import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { warehouses } from '#schema'
import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'warehouse:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(warehouses).set({ deletedAt: now }).where(eq(warehouses.id, id))
  return { code: 0, data: null, message: '仓库已删除' }
})
