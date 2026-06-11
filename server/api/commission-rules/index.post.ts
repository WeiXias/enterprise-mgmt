import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(100),
  baseType: z.enum(['contract_amount', 'payment_amount']),
  rate: z.number().min(0).max(1),
  productId: z.string().optional().nullable(),
  minAmount: z.number().min(0).optional().nullable(),
  maxAmount: z.number().min(0).optional().nullable(),
  isActive: z.enum(['yes', 'no']).optional(),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'commission:manage')
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const ruleId = generateId()
  const result = await db.insert(commissionRules).values({
    id: ruleId,
    name: parsed.data.name,
    baseType: parsed.data.baseType,
    rate: parsed.data.rate,
    productId: parsed.data.productId || null,
    minAmount: parsed.data.minAmount ?? 0,
    maxAmount: parsed.data.maxAmount || null,
    isActive: parsed.data.isActive || 'yes',
    createdAt: now,
    updatedAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'commission', targetId: ruleId, detail: `创建了提成规则「${parsed.data.name}」` })
  return { code: 0, data: result[0], message: '提成规则已添加' }
})
