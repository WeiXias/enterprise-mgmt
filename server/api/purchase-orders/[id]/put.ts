import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders, purchaseOrderItems } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import dayjs from 'dayjs'
import { generateId } from '#server-utils/id'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  supplierId: z.string().optional(),
  expectedDate: z.string().optional().nullable(),
  remark: z.string().optional(),
  contractFilePath: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).max(1).optional(),
    taxRate: z.number().min(0).max(1).optional().default(0),
  })).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  if (parsed.data.items) {
    const validItems = parsed.data.items.filter(i => i.productId)
    const totalAmount = validItems.reduce((sum, i) => sum + Math.round(i.quantity * i.unitPrice * (i.discount ?? 1) * 100) / 100, 0)

    await db.update(purchaseOrders).set({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.supplierId !== undefined && { supplierId: parsed.data.supplierId }),
      ...(parsed.data.expectedDate !== undefined && { expectedDate: parsed.data.expectedDate || null }),
      ...(parsed.data.remark !== undefined && { remark: parsed.data.remark }),
      ...(parsed.data.contractFilePath !== undefined && { contractFilePath: parsed.data.contractFilePath || null }),
      totalAmount,
      updatedAt: now,
    }).where(eq(purchaseOrders.id, id))

    // 替换产品明细：删旧插新
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, id))
    if (validItems.length > 0) {
      await db.insert(purchaseOrderItems).values(
        validItems.map(item => ({
          id: generateId(),
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount ?? 1,
          amount: Math.round(item.quantity * item.unitPrice * (item.discount ?? 1) * 100) / 100,
          taxRate: item.taxRate ?? 0,
        }))
      )
    }
  } else {
    await db.update(purchaseOrders).set({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.supplierId !== undefined && { supplierId: parsed.data.supplierId }),
      ...(parsed.data.expectedDate !== undefined && { expectedDate: parsed.data.expectedDate || null }),
      ...(parsed.data.remark !== undefined && { remark: parsed.data.remark }),
      ...(parsed.data.contractFilePath !== undefined && { contractFilePath: parsed.data.contractFilePath || null }),
      updatedAt: now,
    }).where(eq(purchaseOrders.id, id))
  }

  return { code: 0, data: null, message: '已保存' }
})
