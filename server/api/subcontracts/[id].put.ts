import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['draft', 'approved', 'in_progress', 'completed', 'terminated']).optional(),
  totalAmount: z.number().min(0).optional(),
  subcontractPartyId: z.string().optional(),
  taxRate: z.number().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包合同不存在' })

  const updateData: Record<string, unknown> = {}
  const data = parsed.data
  if (data.name !== undefined) updateData.name = data.name
  if (data.status !== undefined) updateData.status = data.status
  if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount
  if (data.subcontractPartyId !== undefined) updateData.subcontractPartyId = data.subcontractPartyId
  if (data.taxRate !== undefined) updateData.taxRate = data.taxRate
  updateData.updatedAt = new Date().toISOString()

  await db.update(contracts).set(updateData).where(eq(contracts.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'subcontract', targetId: id, detail: '更新了分包合同' })

  return { code: 0, data: null, message: '已保存' }
})
