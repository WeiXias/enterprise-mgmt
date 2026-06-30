import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts, payments, paymentPlans, financeTransactions } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  paymentPlanId: z.string().optional(),
  amount: z.number().min(0),
  paymentDate: z.string(),
  paymentMethod: z.string().optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'payment:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: contractId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const paymentId = generateId()
  await db.insert(payments).values({
    id: paymentId,
    contractId,
    paymentPlanId: parsed.data.paymentPlanId || null,
    amount: parsed.data.amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethod: parsed.data.paymentMethod || null,
    remark: parsed.data.remark || null,
    createdBy: user.userId,
    createdAt: now,
  })

  // If linked to a plan, mark it as paid
  if (parsed.data.paymentPlanId) {
    await db.update(paymentPlans)
      .set({ status: 'paid' })
      .where(eq(paymentPlans.id, parsed.data.paymentPlanId))
  }

  // Auto-generate finance income transaction
  await db.insert(financeTransactions).values({
    id: generateId(),
    type: 'income',
    amount: parsed.data.amount,
    category: 'contract_payment',
    sourceType: 'contract_payment',
    sourceId: paymentId,
    contractId,
    transactionDate: parsed.data.paymentDate,
    description: `合同收款${parsed.data.remark ? ' - ' + parsed.data.remark : ''}`,
    paymentMethod: parsed.data.paymentMethod || null,
    createdBy: user.userId,
    createdAt: now,
  })

  await logOperation(event, { action: 'CREATE', module: 'payment', targetId: paymentId, detail: '记录了收款' })

  return { code: 0, data: null, message: '收款已登记' }
})
