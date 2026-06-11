import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { invoices } from '#schema'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const { invoiceNo, type, contractId, customerId, amount, taxRate, issuedAt, dueDate, remark } = body || {}
  if (!invoiceNo || !amount) throw createError({ statusCode: 422, statusMessage: '发票号和金额不能为空' })

  const taxAmount = Math.round(amount * (taxRate || 0) * 100) / 100

  const result = await db.insert(invoices).values({
    id: generateId(),
    invoiceNo: invoiceNo || `FP-${Date.now()}`,
    type: type || 'vat_normal',
    contractId, customerId,
    amount: amount || 0,
    taxRate: taxRate || 0,
    taxAmount,
    issuedAt, dueDate, remark,
    createdBy: user.userId,
  }).returning()

  return { code: 0, data: result[0], message: '发票已创建' }
})
