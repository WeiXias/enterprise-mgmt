import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ reason: z.string().min(1, '驳回原因还没填呢') })

import { requireTransition } from '#server-utils/workflow'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'contract:approve')
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: contracts.id, status: contracts.status }).from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })
  requireTransition('contracts', existing[0].status, 'draft')

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(contracts).set({
    status: 'draft',
    rejectReason: parsed.data.reason,
    updatedAt: now,
  }).where(eq(contracts.id, id))

  await logOperation(event, { action: 'REJECT', module: 'contract', targetId: id, detail: '驳回了合同' })

  return { code: 0, data: null, message: '已驳回，可以修改后重新提交' }
})
