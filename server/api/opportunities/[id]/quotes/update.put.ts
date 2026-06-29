import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.string().optional(),
  validUntil: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报价不存在' })

  const updateData: Record<string, unknown> = {}
  const data = parsed.data
  if (data.status) updateData.status = data.status
  if (data.validUntil) updateData.validUntil = data.validUntil
  if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date().toISOString()
    await db.update(quotes).set(updateData).where(eq(quotes.id, id))
    await logOperation(event, { action: 'UPDATE', module: 'quote', targetId: id, detail: `更新了报价` })
  }

  return { code: 0, data: null, message: '已保存' }
})
