import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { commissions, commissionRules, contracts, payments } from '#schema'
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

  // 查找合同
  const contractResult = await db.select().from(contracts)
    .where(and(eq(contracts.id, parsed.data.contractId), isNull(contracts.deletedAt))).limit(1)
  if (contractResult.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  // 获取启用中的规则
  const rules = await db.select().from(commissionRules).where(eq(commissionRules.isActive, 'yes'))

  // 获取付款金额（若规则 baseType 为 payment_amount 时需要）
  let paymentAmount = 0
  if (parsed.data.paymentId) {
    const paymentResult = await db.select({ amount: payments.amount }).from(payments)
      .where(eq(payments.id, parsed.data.paymentId)).limit(1)
    if (paymentResult.length > 0) paymentAmount = paymentResult[0].amount
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const periodMonth = now.slice(0, 7)

  const results = []
  for (const rule of rules) {
    // 幂等性检查：同一合同+规则组合已有记录就跳过
    const existing = await db.select({ id: commissions.id }).from(commissions)
      .where(and(
        eq(commissions.contractId, parsed.data.contractId),
        eq(commissions.ruleId, rule.id),
        isNull(commissions.deletedAt),
      )).limit(1)
    if (existing.length > 0) continue

    // 根据规则 baseType 选择计算基数
    let baseAmount: number
    if (rule.baseType === 'contract_amount') {
      baseAmount = contractResult[0].totalAmount
    } else {
      // payment_amount — 需要传入 paymentId
      if (!parsed.data.paymentId) continue
      baseAmount = paymentAmount
    }

    const amount = Math.round(baseAmount * Number(rule.rate))

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

  if (results.length === 0) {
    return { code: 0, data: { results }, message: '没有需要计算的提成，可能已经算过了或缺少付款信息' }
  }

  return { code: 0, data: { results }, message: '提成已计算' }
})
