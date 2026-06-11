import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products } from '#schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const user = event.context.user
  const page = Math.max(1, parseInt(q.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')))

  const conditions: Record<string, unknown>[] = []
  if (q.type) conditions.push(eq(inventoryTransactions.type, q.type))
  if (q.productId) conditions.push(eq(inventoryTransactions.productId, q.productId))
  if (q.contractId) conditions.push(eq(inventoryTransactions.contractId, q.contractId))
  if (q.startDate) conditions.push(sql`${inventoryTransactions.createdAt} >= ${q.startDate}`)
  if (q.endDate) conditions.push(sql`${inventoryTransactions.createdAt} <= ${q.endDate}`)

  // 普通成员只能看自己的操作记录
  if (user && (user.role === 'sales_member' || user.role === 'finance')) {
    conditions.push(eq(inventoryTransactions.operatorId, user.userId))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [list, totalResult] = await Promise.all([
    db.select({
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
      .where(where)
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(inventoryTransactions).where(where),
  ])

  return { code: 0, data: { items: list, total: totalResult[0]?.count ?? 0, page, pageSize } }
})
