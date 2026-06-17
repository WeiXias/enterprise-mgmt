import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { subcontracts } from '#schema'
import { eq, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

import { requireTransition } from '#server-utils/workflow'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:approve')
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: subcontracts.id, status: subcontracts.status }).from(subcontracts)
    .where(eq(subcontracts.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分包合同不存在' })
  requireTransition('subcontracts', existing[0].status, 'in_progress')
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(subcontracts).set({
    status: 'in_progress',
    updatedAt: now,
  }).where(eq(subcontracts.id, id))

  await logOperation(event, { action: 'APPROVE', module: 'subcontract', targetId: id, detail: '确认了分包合同' })

  return { code: 0, data: null, message: '分包合同已确认！' }
})
