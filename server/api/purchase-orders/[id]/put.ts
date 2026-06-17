import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import dayjs from 'dayjs'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  supplierId: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  status: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(purchaseOrders)
    .set({ ...parsed.data, updatedAt: now })
    .where(eq(purchaseOrders.id, id))

  return { code: 0, data: null, message: '已保存' }
})
