import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { commissions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { requireTransition } from '#server-utils/workflow'

const schema = z.object({ reason: z.string().min(1, '驳回原因还没填呢') })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:approve')
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: commissions.id, status: commissions.status }).from(commissions)
    .where(and(eq(commissions.id, id), isNull(commissions.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '提成记录不存在' })
  requireTransition('commissions', existing[0].status, 'rejected')

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(commissions).set({
    status: 'rejected',
    adjustReason: parsed.data.reason,
    approvedBy: user.userId,
    approvedAt: now,
  }).where(eq(commissions.id, id))
  await logOperation(event, { action: 'REJECT', module: 'commission', targetId: id, detail: '驳回了提成' })
  return { code: 0, data: null, message: '已驳回' }
})
