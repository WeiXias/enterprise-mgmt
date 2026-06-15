import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { reimbursements } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { requireTransition } from '#server-utils/workflow'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: reimbursements.id, status: reimbursements.status }).from(reimbursements)
    .where(eq(reimbursements.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报销单不存在' })
  requireTransition('reimbursements', existing[0].status, 'approved')

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(reimbursements).set({
    status: 'approved',
    approvedBy: user.userId,
    approvedAt: now,
  }).where(eq(reimbursements.id, id))
  await logOperation(event, { action: 'APPROVE', module: 'reimbursement', targetId: id, detail: '审批通过了报销' })
  return { code: 0, data: null, message: '审批通过了！' }
})
