import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { paymentPlans } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ amount: z.number().min(0), planDate: z.string(), remark: z.string().optional() })

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  const existing = await db.select({ id: paymentPlans.id }).from(paymentPlans).where(eq(paymentPlans.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '收款计划不存在' })
  const result = await db.update(paymentPlans).set({
    amount: parsed.data.amount,
    planDate: parsed.data.planDate,
    remark: parsed.data.remark || null,
  }).where(eq(paymentPlans.id, id)).returning()

  await logOperation(event, { action: 'UPDATE', module: 'payment', targetId: id, detail: '更新了收款计划' })

  return { code: 0, data: result[0], message: '已保存' }
})
