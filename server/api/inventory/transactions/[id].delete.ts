import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products, purchaseOrders } from '#schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(inventoryTransactions).where(and(eq(inventoryTransactions.id, id), isNull(inventoryTransactions.deletedAt))).limit(1)
    if (!record) throw createError({ statusCode: 404, statusMessage: '记录不存在' })

    // 反向冲正库存
    const delta = -record.quantity
    const [product] = await tx.select({ stockQuantity: products.stockQuantity }).from(products).where(eq(products.id, record.productId)).limit(1)
    if (product) {
      await tx.update(products).set({ stockQuantity: product.stockQuantity + delta }).where(eq(products.id, record.productId))
    }

    // 如果是采购收货产生的入库（batchNo 以 PO- 开头），回滚采购订单状态到 submitted
    if (record.batchNo?.startsWith('PO-')) {
      const code = record.batchNo.replace(/^PO-/, '')
      if (code) {
        const [po] = await tx.select({ id: purchaseOrders.id, status: purchaseOrders.status }).from(purchaseOrders)
          .where(and(eq(purchaseOrders.code, code), isNull(purchaseOrders.deletedAt))).limit(1)
        if (po && po.status === 'received') {
          const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
          await tx.update(purchaseOrders).set({ status: 'submitted', updatedAt: now }).where(eq(purchaseOrders.id, po.id))
        }
      }
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    await tx.update(inventoryTransactions).set({ deletedAt: now }).where(eq(inventoryTransactions.id, id))
  })

  await logOperation(event, { action: 'DELETE', module: 'inventory', targetId: id, detail: '删除了库存记录并回退库存' })
  return { code: 0, data: null, message: '记录已删除，库存已回退' }
})
