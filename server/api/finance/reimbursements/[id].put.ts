import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { reimbursements } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  type: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  reason: z.string().min(1).optional(),
  receiptUrls: z.string().optional(),
  projectId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: reimbursements.id, status: reimbursements.status, createdBy: reimbursements.createdBy })
    .from(reimbursements).where(eq(reimbursements.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报销单不存在' })
  if (existing[0].status !== 'pending') throw createError({ statusCode: 400, statusMessage: '只有待审批状态才能修改' })

  const updateData: Record<string, unknown> = {}
  for (const key of ['type', 'amount', 'reason', 'receiptUrls', 'projectId'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  await db.update(reimbursements).set(updateData).where(eq(reimbursements.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'reimbursement', targetId: id, detail: '更新了报销申请' })
  return { code: 0, data: null, message: '已保存' }
})
