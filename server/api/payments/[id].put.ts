import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { payments } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ amount: z.number().min(0).optional(), paymentDate: z.string().optional(), method: z.string().optional(), receiptNo: z.string().optional(), remark: z.string().optional() })

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  const existing = await db.select({ id: payments.id }).from(payments).where(eq(payments.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '收款记录不存在' })
  const updateData: Record<string, unknown> = {}
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount
  if (parsed.data.paymentDate) updateData.paymentDate = new Date(parsed.data.paymentDate)
  if (parsed.data.method !== undefined) updateData.method = parsed.data.method
  if (parsed.data.receiptNo !== undefined) updateData.receiptNo = parsed.data.receiptNo
  if (parsed.data.remark !== undefined) updateData.remark = parsed.data.remark
  const result = await db.update(payments).set(updateData).where(eq(payments.id, id)).returning()

  await logOperation(event, { action: 'UPDATE', module: 'payment', targetId: id, detail: '更新了收款记录' })

  return { code: 0, data: result[0], message: '已保存' }
})
