import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { invoices, contracts, customers, users } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'invoice:view')
  const [record] = await db.select({
    id: invoices.id, invoiceNo: invoices.invoiceNo, type: invoices.type,
    contractId: invoices.contractId, contractName: contracts.name,
    customerId: invoices.customerId, customerName: customers.name,
    amount: invoices.amount, taxRate: invoices.taxRate, taxAmount: invoices.taxAmount,
    status: invoices.status, issuedAt: invoices.issuedAt, dueDate: invoices.dueDate,
    remark: invoices.remark, filePath: invoices.filePath,
    createdBy: invoices.createdBy, createdByName: users.name,
    createdAt: invoices.createdAt,
  }).from(invoices)
    .leftJoin(contracts, eq(invoices.contractId, contracts.id))
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(users, eq(invoices.createdBy, users.id))
    .where(eq(invoices.id, id)).limit(1)

  if (!record) throw createError({ statusCode: 404, statusMessage: '发票不存在' })
  return { code: 0, data: record }
})
