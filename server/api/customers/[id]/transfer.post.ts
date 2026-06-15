import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { customers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ toUserId: z.string(), reason: z.string().optional() })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  if (user.role === 'sales_member') throw createError({ statusCode: 403, statusMessage: '这个需要管理员才能操作' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '新归属人还没选呢' })

  const existing = await db.select({ id: customers.id, ownerUserId: customers.ownerUserId }).from(customers)
    .where(and(eq(customers.id, id), isNull(customers.deletedAt))).limit(1) as { id: string; ownerUserId: string }[]
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '客户不存在' })

  if (existing[0].ownerUserId === parsed.data.toUserId) throw createError({ statusCode: 409, statusMessage: '不能转给自己' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(customers).set({ ownerUserId: parsed.data.toUserId, updatedAt: now }).where(eq(customers.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'customer', targetId: id, detail: { transferTo: parsed.data.toUserId, reason: parsed.data.reason } })

  return { code: 0, data: null, message: '客户已转交' }
})
