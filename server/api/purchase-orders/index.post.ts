import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchaseOrderItems } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  supplierId: z.string().min(1),
  contractId: z.string().optional(),
  expectedDate: z.string().optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(1).optional(),
  })).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const orderId = generateId()
  const dateStr = dayjs().format('YYYYMMDD')
  const seq = Math.random().toString(36).slice(2, 6).toUpperCase()
  const code = `PO-${dateStr}-${seq}`

  const validItems = (parsed.data.items || []).filter(i => i.productId)
  const totalAmount = validItems.reduce((sum, i) => sum + Math.round(i.quantity * i.unitPrice * (i.discount ?? 1) * 100) / 100, 0)

  await db.insert(purchaseOrders).values({
    id: orderId,
    code,
    name: code,
    supplierId: parsed.data.supplierId,
    contractId: parsed.data.contractId || null,
    expectedDate: parsed.data.expectedDate || null,
    totalAmount,
    status: 'draft',
    remark: parsed.data.remark || '',
    createdAt: now,
    updatedAt: now,
  })

  if (validItems.length > 0) {
    await db.insert(purchaseOrderItems).values(
      validItems.map(item => ({
        id: generateId(),
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? 1,
        amount: Math.round(item.quantity * item.unitPrice * (item.discount ?? 1) * 100) / 100,
      }))
    )
  }

  await logOperation(event, { action: 'CREATE', module: 'purchase_order', targetId: orderId, detail: `创建了采购订单「${code}」` })

  return { code: 0, data: { id: orderId, code }, message: '搞定了！采购订单已创建' }
})
