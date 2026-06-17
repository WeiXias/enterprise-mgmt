import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(purchaseOrders).set({ deletedAt: now }).where(eq(purchaseOrders.id, id))
  return { code: 0, data: null, message: '已删除' }
})
