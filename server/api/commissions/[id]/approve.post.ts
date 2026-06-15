import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { commissions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { requireTransition } from '#server-utils/workflow'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:approve')
  const { id } = getRouterParams(event)

  const existing = await db.select({ id: commissions.id, status: commissions.status }).from(commissions)
    .where(and(eq(commissions.id, id), isNull(commissions.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '提成记录不存在' })
  requireTransition('commissions', existing[0].status, 'approved')

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(commissions).set({
    status: 'approved',
    approvedBy: user.userId,
    approvedAt: now,
  }).where(eq(commissions.id, id))
  await logOperation(event, { action: 'APPROVE', module: 'commission', targetId: id, detail: '审批通过了提成' })
  return { code: 0, data: null, message: '审批通过了！' }
})
