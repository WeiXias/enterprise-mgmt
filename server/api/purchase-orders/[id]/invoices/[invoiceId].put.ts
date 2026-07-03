import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchasePayables, purchaseInvoices } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  invoiceNo: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  remark: z.string().optional(),
  filePath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: orderId, invoiceId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const [invoice] = await db.select().from(purchaseInvoices)
    .where(and(eq(purchaseInvoices.id, invoiceId), eq(purchaseInvoices.orderId, orderId), isNull(purchaseInvoices.deletedAt))).limit(1)
  if (!invoice) throw createError({ statusCode: 404, statusMessage: '发票记录不存在' })

  const oldTotal = invoice.totalAmount
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const newAmount = parsed.data.amount ?? invoice.amount
  const newTaxRate = parsed.data.taxRate ?? invoice.taxRate
  const newTotalAmount = parsed.data.totalAmount ?? Math.round(newAmount * (1 + newTaxRate))
  const newTaxAmount = parsed.data.taxAmount ?? Math.round(newAmount * newTaxRate)

  // 计算 diff 后再事务
  const diff = newTotalAmount - oldTotal

  await db.transaction(async (tx) => {
    await tx.update(purchaseInvoices).set({
      invoiceNo: parsed.data.invoiceNo ?? invoice.invoiceNo,
      amount: newAmount,
      taxRate: newTaxRate,
      taxAmount: newTaxAmount,
      totalAmount: newTotalAmount,
      remark: parsed.data.remark !== undefined ? (parsed.data.remark || null) : invoice.remark,
      filePath: parsed.data.filePath !== undefined ? (parsed.data.filePath || null) : invoice.filePath,
    }).where(eq(purchaseInvoices.id, invoiceId))

    // 重新计算 payable 的 invoiceAmount
    if (diff !== 0) {
      const [payable] = await tx.select({ id: purchasePayables.id, invoiceAmount: purchasePayables.invoiceAmount }).from(purchasePayables)
        .where(and(eq(purchasePayables.orderId, orderId), isNull(purchasePayables.deletedAt))).limit(1)
      if (payable) {
        await tx.update(purchasePayables).set({
          invoiceAmount: payable.invoiceAmount + diff,
          updatedAt: now,
        }).where(eq(purchasePayables.id, payable.id))
      }
    }
  })

  await logOperation(event, { action: 'UPDATE', module: 'purchase_invoice', targetId: invoiceId, detail: `修改了供应商发票「${parsed.data.invoiceNo ?? invoice.invoiceNo}」` })

  return { code: 0, data: { id: invoiceId }, message: '发票已更新' }
})
