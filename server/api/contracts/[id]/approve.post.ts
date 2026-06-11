import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:approve')
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contracts.id, status: contracts.status }).from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })
  if (existing[0].status !== 'draft') throw createError({ statusCode: 400, statusMessage: '只有草稿才能审批' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(contracts).set({
    status: 'approved',
    approvedBy: user.userId,
    approvedAt: now,
    updatedAt: now,
  }).where(eq(contracts.id, id))

  await logOperation(event, { action: 'APPROVE', module: 'contract', targetId: id, detail: '审批通过了合同' })

  return { code: 0, data: null, message: '审批通过了！' }
})
