import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { inventoryTransactions, products } from '#schema'
import { eq, and, asc, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const sortBy = (q.sortBy as string) || 'createdAt'
  const sortOrder = (q.sortOrder as string) || 'desc'
  const page = Math.max(1, parseInt(q.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')))

  const conditions: Record<string, unknown>[] = []
  if (q.type) conditions.push(eq(inventoryTransactions.type, q.type))
  if (q.productId) conditions.push(eq(inventoryTransactions.productId, q.productId))
  if (q.contractId) conditions.push(eq(inventoryTransactions.contractId, q.contractId))
  if (q.startDate) conditions.push(sql`${inventoryTransactions.createdAt} >= ${q.startDate}`)
  if (q.endDate) conditions.push(sql`${inventoryTransactions.createdAt} <= ${q.endDate}`)

  if (user.role === 'sales_member' || user.role === 'finance') {
    conditions.push(eq(inventoryTransactions.operatorId, user.userId))
  }

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    createdAt: inventoryTransactions.createdAt, type: inventoryTransactions.type,
    quantity: inventoryTransactions.quantity, unitPrice: inventoryTransactions.unitPrice,
  }
  const orderColumn = sortColumns[sortBy] || inventoryTransactions.createdAt

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
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(inventoryTransactions).where(where),
  ])

  return { code: 0, data: { items: list, total: totalResult[0]?.count ?? 0, page, pageSize } }
})
