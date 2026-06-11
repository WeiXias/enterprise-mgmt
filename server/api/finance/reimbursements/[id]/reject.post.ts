import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { reimbursements } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ rejectedReason: z.string().min(1, '驳回原因还没填呢') })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(reimbursements).set({
    status: 'rejected',
    approvedBy: user.userId,
    approvedAt: now,
    rejectedReason: parsed.data.rejectedReason,
  }).where(eq(reimbursements.id, id))
  await logOperation(event, { action: 'REJECT', module: 'reimbursement', targetId: id, detail: '驳回了报销' })
  return { code: 0, data: null, message: '已驳回' }
})
