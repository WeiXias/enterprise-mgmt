import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { customers, customerTransfers } from '#schema/customers'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  customerIds: z.array(z.string()).min(1).max(100),
  toUserId: z.string(),
  reason: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  if (user.role === 'sales' || user.role === 'sales_member') throw createError({ statusCode: 403, statusMessage: '这个需要管理员或销售负责人才能操作' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

  // 验证所有客户存在
  const existing = await db.select({ id: customers.id, ownerUserId: customers.ownerUserId }).from(customers)
    .where(and(inArray(customers.id, parsed.data.customerIds), isNull(customers.deletedAt))) as { id: string; ownerUserId: string }[]

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '没有找到可转移的客户' })

  const transferIds = existing.filter(c => c.ownerUserId !== parsed.data.toUserId).map(c => c.id)
  if (transferIds.length === 0) throw createError({ statusCode: 409, statusMessage: '所选客户都已归属该用户' })

  // 批量更新
  await db.update(customers).set({ ownerUserId: parsed.data.toUserId, updatedAt: now })
    .where(and(inArray(customers.id, transferIds), isNull(customers.deletedAt)))

  // 批量写转移记录
  await db.insert(customerTransfers).values(
    existing.filter((c: { id: string; ownerUserId: string }) => c.ownerUserId !== parsed.data.toUserId).map((c: { id: string; ownerUserId: string }) => ({
      id: generateId(),
      customerId: c.id,
      fromUserId: c.ownerUserId,
      toUserId: parsed.data.toUserId,
      reason: parsed.data.reason || null,
      createdAt: now,
    }))
  )

  await logOperation(event, { action: 'UPDATE', module: 'customer', targetId: transferIds[0], detail: { batchTransfer: transferIds.length, toUserId: parsed.data.toUserId, reason: parsed.data.reason } })

  return { code: 0, data: { transferred: transferIds.length }, message: `搞定了！${transferIds.length} 个客户已转交` }
})
