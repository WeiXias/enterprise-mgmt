import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { reimbursements } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  type: z.string().min(1),
  amount: z.number().min(0),
  reason: z.string().min(1),
  receiptUrls: z.string().optional(),
  projectId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'reimbursement:view')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const reimbId = generateId()
  const result = await db.insert(reimbursements).values({
    id: reimbId,
    userId: user.userId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    receiptUrls: parsed.data.receiptUrls || null,
    status: 'pending',
    projectId: parsed.data.projectId || null,
    createdBy: user.userId,
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'reimbursement', targetId: reimbId, detail: '提交了报销申请' })
  return { code: 0, data: result[0], message: '报销申请已提交' }
})
