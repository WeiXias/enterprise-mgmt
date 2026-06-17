import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  name: z.string().min(1).max(200).optional().default(''),
  supplierId: z.string().optional(),
  totalAmount: z.number().min(0).optional().default(0),
  remark: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  await db.insert(purchaseOrders).values({
    id,
    name: parsed.data.name || '',
    supplierId: parsed.data.supplierId,
    totalAmount: parsed.data.totalAmount,
    remark: parsed.data.remark,
    status: 'draft',
  })

  return { code: 0, data: { id }, message: '采购订单已创建' }
})
