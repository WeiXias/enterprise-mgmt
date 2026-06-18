import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const [record] = await db.select({
    id: inventoryTransactions.id,
    productId: inventoryTransactions.productId,
    productName: products.name,
    type: inventoryTransactions.type,
    quantity: inventoryTransactions.quantity,
    unitPrice: inventoryTransactions.unitPrice,
    contractId: inventoryTransactions.contractId,
    projectId: inventoryTransactions.projectId,
    batchNo: inventoryTransactions.batchNo,
    remark: inventoryTransactions.remark,
    operatorId: inventoryTransactions.operatorId,
    createdAt: inventoryTransactions.createdAt,
  }).from(inventoryTransactions)
    .leftJoin(products, eq(inventoryTransactions.productId, products.id))
    .where(eq(inventoryTransactions.id, id))
    .limit(1)

  if (!record) throw createError({ statusCode: 404, statusMessage: '记录不存在' })

  if (user && (user.role === 'sales_member' || user.role === 'finance')) {
    if (record.operatorId !== user.userId) {
      throw createError({ statusCode: 403, statusMessage: '无权查看此记录' })
    }
  }

  return { code: 0, data: record }
})
