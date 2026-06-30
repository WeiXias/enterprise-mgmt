import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryCountItems } from '#schema'
import { products } from '#schema/products'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const list = await db.select({
    id: inventoryCountItems.id,
    productId: inventoryCountItems.productId,
    productName: products.name,
    productCode: products.code,
    systemQuantity: inventoryCountItems.systemQuantity,
    actualQuantity: inventoryCountItems.actualQuantity,
    status: inventoryCountItems.status,
    difference: sql<number>`${inventoryCountItems.actualQuantity} - ${inventoryCountItems.systemQuantity}`,
  }).from(inventoryCountItems)
    .leftJoin(products, eq(inventoryCountItems.productId, products.id))
    .where(and(eq(inventoryCountItems.countId, id), isNull(inventoryCountItems.deletedAt)))
    .orderBy(products.name)

  return { code: 0, data: list }
})
