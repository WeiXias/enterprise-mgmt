import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: purchaseOrders.id, status: purchaseOrders.status, code: purchaseOrders.code })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), isNull(purchaseOrders.deletedAt)))
    .limit(1)

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '采购订单不存在' })
  if (!['draft', 'submitted'].includes(existing[0].status)) throw createError({ statusCode: 422, statusMessage: '当前状态不能取消' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(purchaseOrders).set({ status: 'cancelled', updatedAt: now }).where(eq(purchaseOrders.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'purchase_order', targetId: id, detail: `取消了采购订单「${existing[0].code}」` })

  return { code: 0, data: null, message: '已取消' }
})
