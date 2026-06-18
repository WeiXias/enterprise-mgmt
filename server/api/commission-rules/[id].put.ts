import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseType: z.enum(['contract_amount', 'payment_amount']).optional(),
  rate: z.number().min(0).max(1).optional(),
  productId: z.string().optional().nullable(),
  minAmount: z.number().min(0).optional().nullable(),
  maxAmount: z.number().min(0).optional().nullable(),
  isActive: z.enum(['yes', 'no']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:manage')
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }
  for (const key of ['name', 'baseType', 'rate', 'productId', 'minAmount', 'maxAmount', 'isActive'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }

  const result = await db.update(commissionRules).set(updateData).where(eq(commissionRules.id, id)).returning()
  await logOperation(event, { action: 'UPDATE', module: 'commission', targetId: id, detail: '更新了提成规则' })
  return { code: 0, data: result[0], message: '规则已更新' }
})
