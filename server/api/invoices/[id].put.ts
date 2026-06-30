import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { invoices } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'invoice:edit')
  const [record] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!record) throw createError({ statusCode: 404, statusMessage: '发票不存在' })

  const body = await readBody(event)
  const { invoiceNo, type, contractId, customerId, amount, taxRate, issuedAt, dueDate, remark, status, filePath } = body || {}

  // 税额 = 金额 × 税率 / 100（税率如 6 代表 6%）
  const newAmount = amount ?? record.amount
  const newTaxRate = taxRate ?? record.taxRate
  const taxAmount = Math.round(newAmount * newTaxRate * 100) / 100 // Bug修复: taxRate / 100

  const updateData: Record<string, any> = {
    invoiceNo: invoiceNo ?? record.invoiceNo,
    type: type ?? record.type,
    contractId: contractId ?? record.contractId,
    customerId: customerId ?? record.customerId,
    amount: newAmount,
    taxRate: newTaxRate,
    taxAmount,
    issuedAt: issuedAt ?? record.issuedAt,
    dueDate: dueDate ?? record.dueDate,
    remark: remark ?? record.remark,
    filePath: filePath ?? record.filePath,
  }

  // 支持推进到已开票状态
  if (status === 'issued' && record.status === 'pending') {
    updateData.status = 'issued'
    updateData.issuedAt = issuedAt || new Date().toISOString().slice(0, 10)
  }

  await db.update(invoices).set(updateData).where(eq(invoices.id, id))

  return { code: 0, message: '已更新' }
})
