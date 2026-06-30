import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { invoices, contracts, customers } from '#schema'
import { eq, and, desc, like, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  await requirePermission(event, 'product:read')
  const page = Math.max(1, parseInt(q.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')))

  const conditions: Record<string, unknown>[] = []
  if (q.invoiceNo) conditions.push(like(invoices.invoiceNo, `%${q.invoiceNo}%`))
  if (q.contractId) conditions.push(eq(invoices.contractId, q.contractId))
  if (q.customerId) conditions.push(eq(invoices.customerId, q.customerId))
  if (q.status) conditions.push(eq(invoices.status, q.status))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [list, totalResult] = await Promise.all([
    db.select({
      id: invoices.id, invoiceNo: invoices.invoiceNo, type: invoices.type,
      contractId: invoices.contractId, contractName: contracts.name,
      customerId: invoices.customerId, customerName: customers.name,
      amount: invoices.amount, taxRate: invoices.taxRate, taxAmount: invoices.taxAmount,
      status: invoices.status, issuedAt: invoices.issuedAt, dueDate: invoices.dueDate,
      remark: invoices.remark, createdAt: invoices.createdAt,
    }).from(invoices)
      .leftJoin(contracts, eq(invoices.contractId, contracts.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(invoices).where(where),
  ])

  return { code: 0, data: { items: list, total: totalResult[0]?.count ?? 0, page, pageSize } }
})
