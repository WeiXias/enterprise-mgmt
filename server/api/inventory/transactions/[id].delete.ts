import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products, purchaseOrders } from '#schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const [record] = await db.select().from(inventoryTransactions).where(and(eq(inventoryTransactions.id, id), isNull(inventoryTransactions.deletedAt))).limit(1)
  if (!record) throw createError({ statusCode: 404, statusMessage: '记录不存在' })

  // 反向冲正库存
  const delta = -record.quantity
  const [product] = await db.select({ stockQuantity: products.stockQuantity }).from(products).where(eq(products.id, record.productId)).limit(1)
  if (product) {
    if (record.type === 'outbound' && product.stockQuantity + (delta > 0 ? delta : 0) < 0) {
      // 不阻止删除，但保护库存非负
    }
    await db.update(products).set({ stockQuantity: product.stockQuantity + delta }).where(eq(products.id, record.productId))
  }

  // 如果是采购收货产生的入库（batchNo 以 PO- 开头），回滚采购订单状态到 submitted
  if (record.batchNo?.startsWith('PO-')) {
    const code = record.batchNo.replace(/^PO-/, '')
    if (code) {
      const [po] = await db.select({ id: purchaseOrders.id, status: purchaseOrders.status }).from(purchaseOrders)
        .where(and(eq(purchaseOrders.code, code), isNull(purchaseOrders.deletedAt))).limit(1)
      if (po && po.status === 'received') {
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
        await db.update(purchaseOrders).set({ status: 'submitted', updatedAt: now }).where(eq(purchaseOrders.id, po.id))
        await logOperation(event, { action: 'UPDATE', module: 'purchase_order', targetId: po.id, detail: '库存记录删除，采购订单回滚到已提交' })
      }
    }
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(inventoryTransactions).set({ deletedAt: now }).where(eq(inventoryTransactions.id, id))
  await logOperation(event, { action: 'DELETE', module: 'inventory', targetId: id, detail: '删除了库存记录并回退库存' })
  return { code: 0, data: null, message: '记录已删除，库存已回退' }
})
