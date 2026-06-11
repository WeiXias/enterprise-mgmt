import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { reimbursements, financeTransactions } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({ paymentMethod: z.string().optional() })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select().from(reimbursements).where(eq(reimbursements.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报销单不存在' })
  if (existing[0].status !== 'approved') throw createError({ statusCode: 400, statusMessage: '只有已通过的才能打款' })

  const r = existing[0]
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // Create expense transaction
  const txId = generateId()
  await db.insert(financeTransactions).values({
    id: txId,
    type: 'expense',
    amount: r.amount,
    category: 'reimbursement',
    sourceType: 'reimbursement',
    sourceId: id,
    projectId: r.projectId,
    transactionDate: now.slice(0, 10),
    description: `报销打款 - ${r.reason}`,
    paymentMethod: parsed.data.paymentMethod || 'bank_transfer',
    createdBy: user.userId,
    createdAt: now,
  })

  // Mark reimbursement as paid
  await db.update(reimbursements).set({
    status: 'paid',
    paidAt: now,
    paidTransactionId: txId,
  }).where(eq(reimbursements.id, id))

  await logOperation(event, { action: 'APPROVE', module: 'reimbursement', targetId: id, detail: '支付了报销款' })
  return { code: 0, data: null, message: '打款完成，已生成支出记录' }
})
