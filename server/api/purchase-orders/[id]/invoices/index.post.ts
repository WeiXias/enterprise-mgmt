import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchasePayables, purchaseInvoices } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  invoiceNo: z.string().min(1),
  amount: z.number().min(0),
  taxRate: z.number().min(0).max(1).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0).optional().default(0),
  remark: z.string().optional(),
  filePath: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: orderId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const [po] = await db.select({ id: purchaseOrders.id, supplierId: purchaseOrders.supplierId }).from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, orderId), isNull(purchaseOrders.deletedAt))).limit(1)
  if (!po) throw createError({ statusCode: 404, statusMessage: '采购订单不存在' })

  const [payable] = await db.select({ id: purchasePayables.id, status: purchasePayables.status, invoiceAmount: purchasePayables.invoiceAmount }).from(purchasePayables)
    .where(and(eq(purchasePayables.orderId, orderId), isNull(purchasePayables.deletedAt))).limit(1)
  if (!payable) throw createError({ statusCode: 404, statusMessage: '没有对应的应付记录，请先确认收货' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const invoiceId = generateId()
  const totalAmount = parsed.data.totalAmount || Math.round(parsed.data.amount * (1 + parsed.data.taxRate))

  await db.transaction(async (tx) => {
    await tx.insert(purchaseInvoices).values({
      id: invoiceId,
      payableId: payable.id,
      orderId,
      supplierId: po.supplierId!,
      invoiceNo: parsed.data.invoiceNo,
      amount: parsed.data.amount,
      taxRate: parsed.data.taxRate,
      taxAmount: parsed.data.taxAmount || Math.round(parsed.data.amount * parsed.data.taxRate),
      totalAmount,
      status: 'submitted',
      remark: parsed.data.remark || null,
      filePath: parsed.data.filePath || null,
      createdBy: user.userId,
      createdAt: now,
    })

    await tx.update(purchasePayables).set({
      invoiceAmount: payable.invoiceAmount + totalAmount,
      status: 'invoiced',
      updatedAt: now,
    }).where(eq(purchasePayables.id, payable.id))
  })

  await logOperation(event, { action: 'CREATE', module: 'purchase_invoice', targetId: invoiceId, detail: `登记了供应商发票「${parsed.data.invoiceNo}」` })

  return { code: 0, data: { id: invoiceId }, message: '发票已登记' }
})
