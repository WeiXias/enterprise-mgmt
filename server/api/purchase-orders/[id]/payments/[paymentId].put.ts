import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchasePayables, purchasePayments, financeTransactions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  amount: z.number().min(1).optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  remark: z.string().optional(),
  attachmentPath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: orderId, paymentId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const [payment] = await db.select().from(purchasePayments)
    .where(and(eq(purchasePayments.id, paymentId), eq(purchasePayments.orderId, orderId), isNull(purchasePayments.deletedAt))).limit(1)
  if (!payment) throw createError({ statusCode: 404, statusMessage: '付款记录不存在' })

  const oldAmount = payment.amount
  const newAmount = parsed.data.amount ?? oldAmount
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.update(purchasePayments).set({
    amount: newAmount,
    paymentDate: parsed.data.paymentDate ?? payment.paymentDate,
    paymentMethod: parsed.data.paymentMethod !== undefined ? (parsed.data.paymentMethod || null) : payment.paymentMethod,
    remark: parsed.data.remark !== undefined ? (parsed.data.remark || null) : payment.remark,
    attachmentPath: parsed.data.attachmentPath !== undefined ? (parsed.data.attachmentPath || null) : payment.attachmentPath,
  }).where(eq(purchasePayments.id, paymentId))

  // 重新计算 payable 的 paidAmount
  const diff = newAmount - oldAmount
  if (diff !== 0) {
    const [payable] = await db.select({ id: purchasePayables.id, paidAmount: purchasePayables.paidAmount, totalAmount: purchasePayables.totalAmount }).from(purchasePayables)
      .where(and(eq(purchasePayables.orderId, orderId), isNull(purchasePayables.deletedAt))).limit(1)
    if (payable) {
      const newPaid = payable.paidAmount + diff
      let newStatus: string = 'partially_paid'
      if (newPaid >= payable.totalAmount) newStatus = 'paid'
      await db.update(purchasePayables).set({
        paidAmount: newPaid,
        status: newStatus,
        updatedAt: now,
      }).where(eq(purchasePayables.id, payable.id))
    }
  }

  // 同步更新 finance_transactions
  await db.update(financeTransactions).set({
    amount: newAmount,
    transactionDate: parsed.data.paymentDate ?? payment.paymentDate,
    paymentMethod: parsed.data.paymentMethod !== undefined ? (parsed.data.paymentMethod || null) : payment.paymentMethod,
    description: parsed.data.remark !== undefined
      ? `供应商付款：${payment.orderId}${parsed.data.remark ? ' - ' + parsed.data.remark : ''}`
      : payment.remark,
  }).where(and(eq(financeTransactions.sourceType, 'purchase_payment'), eq(financeTransactions.sourceId, paymentId)))

  await logOperation(event, { action: 'UPDATE', module: 'purchase_payment', targetId: paymentId, detail: `修改了供应商付款 ¥${newAmount}` })

  return { code: 0, data: { id: paymentId }, message: '付款已更新' }
})
