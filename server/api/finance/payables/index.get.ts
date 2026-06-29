import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { purchasePayables, purchaseOrders, suppliers } from '#schema'
import { eq, isNull, desc, sql, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const q = getQuery(event) as Record<string, string>
  const supplierId = q.supplierId as string | undefined
  const status = q.status as string | undefined
  const page = Math.max(1, parseInt(q.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')))

  const conditions = [isNull(purchasePayables.deletedAt)]
  if (supplierId) conditions.push(eq(purchasePayables.supplierId, supplierId))
  if (status) conditions.push(eq(purchasePayables.status, status))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: purchasePayables.id,
      orderId: purchasePayables.orderId,
      orderCode: purchaseOrders.code,
      supplierId: purchasePayables.supplierId,
      supplierName: suppliers.name,
      totalAmount: purchasePayables.totalAmount,
      paidAmount: purchasePayables.paidAmount,
      invoiceAmount: purchasePayables.invoiceAmount,
      status: purchasePayables.status,
      dueDate: purchasePayables.dueDate,
      createdAt: purchasePayables.createdAt,
    }).from(purchasePayables)
      .leftJoin(purchaseOrders, eq(purchasePayables.orderId, purchaseOrders.id))
      .leftJoin(suppliers, eq(purchasePayables.supplierId, suppliers.id))
      .where(and(...conditions))
      .orderBy(desc(purchasePayables.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(purchasePayables).where(and(...conditions))
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list,
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
