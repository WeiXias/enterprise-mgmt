import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { commissions, commissionRules, contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const schema = z.object({ contractId: z.string(), paymentId: z.string().optional() })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:manage')

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // Find contract
  const contractResult = await db.select().from(contracts)
    .where(and(eq(contracts.id, parsed.data.contractId), isNull(contracts.deletedAt))).limit(1)
  if (contractResult.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  // Get active rules
  const rules = await db.select().from(commissionRules).where(eq(commissionRules.isActive, 'yes'))

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const periodMonth = now.slice(0, 7)

  const results = []
  for (const rule of rules) {
    const baseAmount = Number(contractResult[0].totalAmount)
    const amount = baseAmount * Number(rule.rate)

    const commissionId = generateId()
    await db.insert(commissions).values({
      id: commissionId,
      userId: user.userId,
      contractId: parsed.data.contractId,
      paymentId: parsed.data.paymentId || null,
      ruleId: rule.id,
      baseAmount,
      rate: Number(rule.rate),
      amount,
      adjustAmount: 0,
      status: 'pending',
      periodMonth,
      createdAt: now,
    })

    await logOperation(event, { action: 'CREATE', module: 'commission', targetId: commissionId, detail: '计算了提成' })
    results.push({ id: commissionId, ruleId: rule.id, ruleName: rule.name, baseAmount, rate: Number(rule.rate), amount })
  }

  return { code: 0, data: { results }, message: '提成已计算' }
})
