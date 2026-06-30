import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  contractIds: z.array(z.string()).min(1).max(100),
  toUserId: z.string(),
  reason: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:transfer')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  if (user.role === 'sales_member') throw createError({ statusCode: 403, statusMessage: '这个需要管理员或销售负责人才能操作' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const existing = await db.select({ id: contracts.id, ownerUserId: contracts.ownerUserId }).from(contracts)
    .where(and(inArray(contracts.id, parsed.data.contractIds), isNull(contracts.deletedAt))) as { id: string; ownerUserId: string | null }[]

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '没有找到可转移的合同' })

  const transferIds = existing.filter(c => c.ownerUserId !== parsed.data.toUserId).map(c => c.id)
  if (transferIds.length === 0) throw createError({ statusCode: 409, statusMessage: '所选合同都已归属该用户' })

  await db.update(contracts).set({ ownerUserId: parsed.data.toUserId, updatedAt: now })
    .where(and(inArray(contracts.id, transferIds), isNull(contracts.deletedAt)))

  await logOperation(event, { action: 'UPDATE', module: 'contract', targetId: transferIds[0], detail: { batchTransfer: transferIds.length, toUserId: parsed.data.toUserId, reason: parsed.data.reason } })

  return { code: 0, data: { transferred: transferIds.length }, message: `搞定了！${transferIds.length} 个合同已转交` }
})
