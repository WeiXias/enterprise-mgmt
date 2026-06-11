import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  ownerUserId: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  partyA: z.string().optional(),
  partyB: z.string().optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: contracts.id, status: contracts.status }).from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1) as { id: string; status: string }[]
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }

  for (const key of ['name', 'ownerUserId', 'totalAmount', 'partyA', 'partyB', 'paymentMethod', 'remark'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  for (const key of ['startDate', 'endDate']) {
    if (parsed.data[key] === '') updateData[key] = null
    else if (parsed.data[key]) updateData[key] = parsed.data[key]
  }

  await db.update(contracts).set(updateData).where(eq(contracts.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'contract', targetId: id, detail: '更新了合同' })

  return { code: 0, data: null, message: '已保存，随时可以改' }
})
