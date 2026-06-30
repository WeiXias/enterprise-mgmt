import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db } from '#database'
import { commissions, users, contracts, commissionRules, commissionPayoutItems } from '#schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'commission:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少提成ID' })

  const [result] = await db.select({
    id: commissions.id,
    userId: commissions.userId,
    userName: sql<string>`(select name from users where users.id = ${commissions.userId})`,
    contractId: commissions.contractId,
    contractCode: sql<string>`(select code from contracts where contracts.id = ${commissions.contractId})`,
    contractName: sql<string>`(select name from contracts where contracts.id = ${commissions.contractId})`,
    baseAmount: commissions.baseAmount,
    rate: commissions.rate,
    amount: commissions.amount,
    adjustAmount: commissions.adjustAmount,
    adjustReason: commissions.adjustReason,
    status: commissions.status,
    periodMonth: commissions.periodMonth,
    remark: commissions.remark,
    approvedBy: commissions.approvedBy,
    approvedByName: sql<string>`(select name from users where users.id = ${commissions.approvedBy})`,
    approvedAt: commissions.approvedAt,
    ruleId: commissions.ruleId,
    ruleName: sql<string>`(select name from commission_rules where commission_rules.id = ${commissions.ruleId})`,
    createdAt: commissions.createdAt,
  }).from(commissions).where(eq(commissions.id, id))

  if (!result) throw createError({ statusCode: 404, statusMessage: '提成记录不存在' })

  // 检查是否已发放（在 payout_items 中）
  const payoutItems = await db.select({
    payoutId: commissionPayoutItems.payoutId,
    amount: commissionPayoutItems.amount,
  }).from(commissionPayoutItems).where(eq(commissionPayoutItems.commissionId, id))

  return {
    code: 0,
    data: {
      ...result,
      user: { id: result.userId, name: result.userName },
      contract: { id: result.contractId, code: result.contractCode, name: result.contractName },
      approvedBy: result.approvedBy ? { id: result.approvedBy, name: result.approvedByName } : null,
      rule: result.ruleId ? { id: result.ruleId, name: result.ruleName } : null,
      payoutItems,
    },
  }
})
