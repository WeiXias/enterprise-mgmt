import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchaseOrderItems, suppliers, products } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const result = await db.select({
    id: purchaseOrders.id,
    code: purchaseOrders.code,
    name: purchaseOrders.name,
    supplierId: purchaseOrders.supplierId,
    supplierName: suppliers.name,
    expectedDate: purchaseOrders.expectedDate,
    totalAmount: purchaseOrders.totalAmount,
    status: purchaseOrders.status,
    remark: purchaseOrders.remark,
    createdAt: purchaseOrders.createdAt,
    updatedAt: purchaseOrders.updatedAt,
  }).from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(eq(purchaseOrders.id, id), isNull(purchaseOrders.deletedAt)))
    .limit(1)

  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '采购订单不存在' })

  const order = result[0]

  const itemList = await db.select({
    id: purchaseOrderItems.id,
    productId: purchaseOrderItems.productId,
    productName: products.name,
    productCode: products.code,
    quantity: purchaseOrderItems.quantity,
    unitPrice: purchaseOrderItems.unitPrice,
    discount: purchaseOrderItems.discount,
    amount: purchaseOrderItems.amount,
  }).from(purchaseOrderItems)
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.orderId, id))

  return { code: 0, data: { ...order, items: itemList } }
})
