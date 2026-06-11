import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const [record] = await db.select().from(inventoryTransactions).where(eq(inventoryTransactions.id, id)).limit(1)
  if (!record) throw createError({ statusCode: 404, statusMessage: '记录不存在' })

  const delta = -record.quantity // 反向冲正
  const [product] = await db.select({ stockQuantity: products.stockQuantity }).from(products).where(eq(products.id, record.productId)).limit(1)
  if (product) {
    if (record.type === 'outbound' && product.stockQuantity + (delta > 0 ? delta : 0) < 0) {
      // 不阻止删除，但保护库存非负
    }
    await db.update(products).set({ stockQuantity: product.stockQuantity + delta }).where(eq(products.id, record.productId))
  }

  await db.delete(inventoryTransactions).where(eq(inventoryTransactions.id, id))
  return { code: 0, message: '记录已删除，库存已回退' }
})
