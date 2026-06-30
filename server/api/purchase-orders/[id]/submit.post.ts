import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: purchaseOrders.id, status: purchaseOrders.status, code: purchaseOrders.code })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), isNull(purchaseOrders.deletedAt)))
    .limit(1)

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '采购订单不存在' })
  if (existing[0].status !== 'draft') throw createError({ statusCode: 422, statusMessage: '只有草稿状态的采购订单才能提交' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(purchaseOrders).set({ status: 'submitted', updatedAt: now }).where(eq(purchaseOrders.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'purchase_order', targetId: id, detail: `提交了采购订单「${existing[0].code}」` })

  return { code: 0, data: null, message: '已提交' }
})
