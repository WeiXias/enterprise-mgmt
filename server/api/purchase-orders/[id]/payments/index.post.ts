import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchasePayables, purchasePayments } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { createAutoVoucher, getOrCreatePeriod, calcTax, isTaxEnabled, getCashAccountCode, getPayableCode } from '#server-utils/accounting/posting'

const schema = z.object({
  amount: z.number().min(1),
  paymentDate: z.string(),
  paymentMethod: z.string().optional(),
  remark: z.string().optional(),
  attachmentPath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: orderId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const [po] = await db.select({ id: purchaseOrders.id, supplierId: purchaseOrders.supplierId, code: purchaseOrders.code }).from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, orderId), isNull(purchaseOrders.deletedAt))).limit(1)
  if (!po) throw createError({ statusCode: 404, statusMessage: '采购订单不存在' })

  const [payable] = await db.select({ id: purchasePayables.id, totalAmount: purchasePayables.totalAmount, paidAmount: purchasePayables.paidAmount, taxAmount: purchasePayables.taxAmount, status: purchasePayables.status }).from(purchasePayables)
    .where(and(eq(purchasePayables.orderId, orderId), isNull(purchasePayables.deletedAt))).limit(1)
  if (!payable) throw createError({ statusCode: 404, statusMessage: '没有对应的应付记录' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const paymentId = generateId()

  const newPaid = payable.paidAmount + parsed.data.amount
  let newStatus: string = 'partially_paid'
  if (newPaid >= payable.totalAmount) {
    newStatus = 'paid'
  }

  // 计算本次付款对应的税额（按付款比例）
  const payRatio = parsed.data.amount / payable.totalAmount
  const taxEnabled = await isTaxEnabled(db)
  const thisTaxAmount = taxEnabled ? Math.round((payable.taxAmount || 0) * payRatio) : 0
  const netAmount = parsed.data.amount

  await db.transaction(async (tx) => {
    await tx.insert(purchasePayments).values({
      id: paymentId,
      payableId: payable.id,
      orderId,
      supplierId: po.supplierId!,
      amount: parsed.data.amount,
      paymentDate: parsed.data.paymentDate,
      paymentMethod: parsed.data.paymentMethod || null,
      remark: parsed.data.remark || null,
      attachmentPath: parsed.data.attachmentPath || null,
      createdBy: user.userId,
      createdAt: now,
    })

    await tx.update(purchasePayables).set({
      paidAmount: newPaid,
      status: newStatus,
      updatedAt: now,
    }).where(eq(purchasePayables.id, payable.id))

    // 自动生成会计凭证
    const period = await getOrCreatePeriod(tx as any, parsed.data.paymentDate)
    const cashCode = await getCashAccountCode(tx as any)
    const payableCode = await getPayableCode(tx as any)

    const voucherEntries: Array<{ accountCode: string; summary: string; debitAmount: number; creditAmount: number; supplierId?: string | null }> = [
      { accountCode: payableCode, summary: '应付账款', debitAmount: netAmount, creditAmount: 0, supplierId: po.supplierId },
      { accountCode: cashCode, summary: '银行存款', debitAmount: 0, creditAmount: netAmount },
    ]

    // 启用增值税核算且有税额时，加入进项税额分录（冲减应付）
    if (taxEnabled && thisTaxAmount > 0) {
      voucherEntries.push({ accountCode: '2221.01', summary: '应交税费-增值税(进项税额)', debitAmount: thisTaxAmount, creditAmount: 0 })
      voucherEntries.push({ accountCode: '1401', summary: '原材料', debitAmount: 0, creditAmount: thisTaxAmount })
    }

    await createAutoVoucher(tx as any, {
      voucherDate: parsed.data.paymentDate,
      summary: `供应商付款：${po.code}${parsed.data.remark ? ' - ' + parsed.data.remark : ''}${taxEnabled && thisTaxAmount > 0 ? ' (含税)' : ''}`,
      sourceType: 'purchase_payment',
      sourceId: paymentId,
      periodId: period.id,
      entries: voucherEntries,
    }, user.userId)
  })

  await logOperation(event, { action: 'CREATE', module: 'purchase_payment', targetId: paymentId, detail: `登记了供应商付款 ¥${parsed.data.amount}` })

  return { code: 0, data: { id: paymentId }, message: '付款已登记' }
})
