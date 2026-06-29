import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchaseOrderItems, inventoryTransactions, products } from '#schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import dayjs from 'dayjs'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const warehouseId = body?.warehouseId as string | undefined

  const existing = await db.select({
    id: purchaseOrders.id,
    status: purchaseOrders.status,
    code: purchaseOrders.code,
  }).from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), isNull(purchaseOrders.deletedAt)))
    .limit(1)

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '采购订单不存在' })
  if (existing[0].status !== 'submitted') throw createError({ statusCode: 422, statusMessage: '只有已提交的采购订单才能确认收货' })

  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id))

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  // 1. 更新订单状态
  await db.update(purchaseOrders).set({ status: 'received', updatedAt: now }).where(eq(purchaseOrders.id, id))

  // 2. 为每个产品创建入库库存流水 + 更新库存量
  for (const item of items) {
    await db.insert(inventoryTransactions).values({
      id: generateId(),
      productId: item.productId,
      type: 'inbound',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      batchNo: `PO-${existing[0].code}`,
      remark: `采购收货：${existing[0].code}`,
      operatorId: user.userId,
      createdAt: now,
    })

    // 原子增加库存
    await db.update(products).set({
      stockQuantity: sql`stock_quantity + ${item.quantity}`,
      updatedAt: now,
    }).where(eq(products.id, item.productId))
  }

  await logOperation(event, { action: 'UPDATE', module: 'purchase_order', targetId: id, detail: `确认收货了采购订单「${existing[0].code}」` })

  return { code: 0, data: null, message: '搞定了！已确认收货，库存已更新' }
})
