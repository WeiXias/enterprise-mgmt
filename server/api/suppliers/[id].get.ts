import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { suppliers, purchaseOrders } from '#schema'
import { contracts } from '#schema/contracts'
import { eq, and, isNull, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const rows = await db.select().from(suppliers)
    .where(and(eq(suppliers.id, id), isNull(suppliers.deletedAt)))
    .limit(1)
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: '供应商不存在' })

  const [contractList, orderList] = await Promise.all([
    db.select({ id: contracts.id, code: contracts.code, name: contracts.name, status: contracts.status, totalAmount: contracts.totalAmount, createdAt: contracts.createdAt })
      .from(contracts).where(and(eq(contracts.supplierId, id), isNull(contracts.deletedAt)))
      .orderBy(desc(contracts.createdAt)).limit(10),
    db.select({ id: purchaseOrders.id, name: purchaseOrders.name, status: purchaseOrders.status, totalAmount: purchaseOrders.totalAmount, createdAt: purchaseOrders.createdAt })
      .from(purchaseOrders).where(and(eq(purchaseOrders.supplierId, id), isNull(purchaseOrders.deletedAt)))
      .orderBy(desc(purchaseOrders.createdAt)).limit(10),
  ])

  return {
    code: 0,
    data: {
      ...rows[0],
      contracts: contractList,
      purchaseOrders: orderList,
    },
  }
})
