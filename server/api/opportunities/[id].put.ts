import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { OpportunityStatus } from '#enums'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  estimatedAmount: z.number().min(0).optional(),
  estimatedCloseDate: z.string().optional().or(z.literal('')),
  source: z.string().optional(),
  competitor: z.string().optional(),
  status: z.enum(Object.values(OpportunityStatus) as [string, ...string[]]).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({
    id: opportunities.id,
    ownerUserId: opportunities.ownerUserId,
    status: opportunities.status,
  }).from(opportunities)
    .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })

  // 已成交/已输单的不能再改状态
  const currentStatus = existing[0].status
  if ((currentStatus === 'closed_won' || currentStatus === 'closed_lost') && parsed.data.status) {
    throw createError({ statusCode: 400, statusMessage: '已经决单了，不能改状态' })
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }
  if (parsed.data.estimatedCloseDate === '') updateData.estimatedCloseDate = null
  else if (parsed.data.estimatedCloseDate) updateData.estimatedCloseDate = parsed.data.estimatedCloseDate

  await db.update(opportunities).set(updateData).where(eq(opportunities.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'opportunity', targetId: id, detail: `更新了商机` })
  return { code: 0, data: null, message: '已保存，随时可以改' }
})
