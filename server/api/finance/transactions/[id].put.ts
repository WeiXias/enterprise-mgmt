import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { financeTransactions } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  amount: z.number().min(0).optional(),
  category: z.string().optional(),
  transactionDate: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: financeTransactions.id, sourceType: financeTransactions.sourceType })
    .from(financeTransactions).where(eq(financeTransactions.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '记录不存在' })
  if (existing[0].sourceType !== 'manual') throw createError({ statusCode: 400, statusMessage: '自动生成的记录不能修改' })

  const updateData: Record<string, unknown> = {}
  for (const key of ['amount', 'category', 'transactionDate', 'description', 'paymentMethod'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  await db.update(financeTransactions).set(updateData).where(eq(financeTransactions.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'finance', targetId: id, detail: '更新了财务流水' })
  return { code: 0, data: null, message: '已保存' }
})
