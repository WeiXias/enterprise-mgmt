import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { paymentPlans } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ amount: z.number().min(0), planDate: z.string(), remark: z.string().optional() })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'payment-plan:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: contractId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.insert(paymentPlans).values({
    id: generateId(),
    contractId,
    amount: parsed.data.amount,
    planDate: parsed.data.planDate,
    remark: parsed.data.remark || null,
    status: 'pending',
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'payment', targetId: result[0].id, detail: '添加了收款计划' })

  return { code: 0, data: result[0], message: '收款计划已添加' }
})
