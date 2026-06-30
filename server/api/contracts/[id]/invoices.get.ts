import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { invoices, customers } from '#schema'
import { eq, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'contract:view')
  const list = await db.select({
    id: invoices.id, invoiceNo: invoices.invoiceNo, type: invoices.type,
    customerName: customers.name,
    amount: invoices.amount, taxRate: invoices.taxRate, taxAmount: invoices.taxAmount,
    status: invoices.status, issuedAt: invoices.issuedAt, dueDate: invoices.dueDate,
    createdAt: invoices.createdAt,
  }).from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.contractId, id))
    .orderBy(desc(invoices.createdAt))

  return { code: 0, data: list }
})
