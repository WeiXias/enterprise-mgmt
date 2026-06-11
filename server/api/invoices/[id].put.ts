import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { invoices } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const [record] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!record) throw createError({ statusCode: 404, statusMessage: '发票不存在' })
  if (record.status !== 'pending') throw createError({ statusCode: 422, statusMessage: '只能编辑待开票状态的发票' })

  const body = await readBody(event)
  const { invoiceNo, type, contractId, customerId, amount, taxRate, issuedAt, dueDate, remark } = body || {}

  const taxAmount = taxRate !== undefined ? Math.round(amount * taxRate * 100) / 100 : record.taxAmount

  await db.update(invoices).set({
    invoiceNo: invoiceNo ?? record.invoiceNo,
    type: type ?? record.type,
    contractId: contractId ?? record.contractId,
    customerId: customerId ?? record.customerId,
    amount: amount ?? record.amount,
    taxRate: taxRate ?? record.taxRate,
    taxAmount,
    issuedAt: issuedAt ?? record.issuedAt,
    dueDate: dueDate ?? record.dueDate,
    remark: remark ?? record.remark,
  }).where(eq(invoices.id, id))

  return { code: 0, message: '已更新' }
})
