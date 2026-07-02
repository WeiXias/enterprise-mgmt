import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchasePayables, purchasePayments, financeTransactions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

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

  const [payable] = await db.select({ id: purchasePayables.id, totalAmount: purchasePayables.totalAmount, paidAmount: purchasePayables.paidAmount, status: purchasePayables.status }).from(purchasePayables)
    .where(and(eq(purchasePayables.orderId, orderId), isNull(purchasePayables.deletedAt))).limit(1)
  if (!payable) throw createError({ statusCode: 404, statusMessage: '没有对应的应付记录' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const paymentId = generateId()
  await db.insert(purchasePayments).values({
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

  const newPaid = payable.paidAmount + parsed.data.amount

  let newStatus: string = 'partially_paid'
  if (newPaid >= payable.totalAmount) {
    newStatus = 'paid'
  }

  await db.update(purchasePayables).set({
    paidAmount: newPaid,
    status: newStatus,
    updatedAt: now,
  }).where(eq(purchasePayables.id, payable.id))

  // 自动生成财务支出流水
  await db.insert(financeTransactions).values({
    id: generateId(),
    type: 'expense',
    amount: parsed.data.amount,
    category: 'purchase_payment',
    sourceType: 'purchase_payment',
    sourceId: paymentId,
    contractId: null,
    transactionDate: parsed.data.paymentDate,
    description: `供应商付款：${po.code}${parsed.data.remark ? ' - ' + parsed.data.remark : ''}`,
    paymentMethod: parsed.data.paymentMethod || null,
    createdBy: user.userId,
    createdAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'purchase_payment', targetId: paymentId, detail: `登记了供应商付款 ¥${parsed.data.amount}` })

  return { code: 0, data: { id: paymentId }, message: '付款已登记' }
})
