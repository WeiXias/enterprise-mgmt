import { defineEventHandler } from 'h3'
import { db } from '#database'
import { accountBalances, accounts, accountingPeriods, vouchers } from '#schema'
import { paymentPlans, reimbursements } from '#schema'
import { eq, and, isNull, desc, sql, count as drizzleCount } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:read')

  // 当前期间
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const currentPeriod = await db.select().from(accountingPeriods)
    .where(and(eq(accountingPeriods.year, year), eq(accountingPeriods.month, month))).limit(1)

  // 总资产/负债/权益（取最新期间的余额汇总）
  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0, netIncome = 0, netExpense = 0
  let overdueCount = 0, pendingReimbCount = 0

  if (currentPeriod.length > 0) {
    const periodId = currentPeriod[0].id

    const balances = await db.select({
      categoryType: accounts.categoryType,
      closingDebit: accountBalances.closingDebit,
      closingCredit: accountBalances.closingCredit,
      balanceDirection: accounts.balanceDirection,
    }).from(accountBalances)
      .leftJoin(accounts, eq(accountBalances.accountId, accounts.id))
      .where(eq(accountBalances.periodId, periodId))

    for (const b of balances) {
      const amount = b.balanceDirection === 'credit'
        ? Number(b.closingCredit) - Number(b.closingDebit)
        : Number(b.closingDebit) - Number(b.closingCredit)

      if (b.categoryType === 'asset') totalAssets += amount
      else if (b.categoryType === 'liability') totalLiabilities += amount
      else if (b.categoryType === 'equity') totalEquity += amount
      else if (b.categoryType === 'revenue_expense') {
        if (amount > 0) netIncome += amount
        else netExpense += Math.abs(amount)
      }
    }
  }

  // 最近凭证
  const recentVouchers = await db.select({
    id: vouchers.id,
    voucherNo: vouchers.voucherNo,
    voucherDate: vouchers.voucherDate,
    summary: vouchers.summary,
    status: vouchers.status,
    sourceType: vouchers.sourceType,
    createdAt: vouchers.createdAt,
  }).from(vouchers)
    .where(isNull(vouchers.deletedAt))
    .orderBy(desc(vouchers.createdAt))
    .limit(10)

  // 待跟进数：逾期应收 + 待审批报销
  const today = new Date().toISOString().slice(0, 10)
  const [overduePlans, pendingReimbRows] = await Promise.all([
    db.select({ cnt: drizzleCount() }).from(paymentPlans).where(
      and(eq(paymentPlans.status, 'pending' as any), sql`${paymentPlans.planDate} < ${today}`)
    ),
    db.select({ cnt: drizzleCount() }).from(reimbursements).where(eq(reimbursements.status, 'pending' as any)),
  ])
  overdueCount = Number(overduePlans[0]?.cnt || 0)
  pendingReimbCount = Number(pendingReimbRows[0]?.cnt || 0)

  return {
    code: 0,
    data: {
      stats: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        netIncome,
        netExpense,
        netProfit: netIncome - netExpense,
        overduePaymentCount: overdueCount,
        pendingReimbursementCount: pendingReimbCount,
      },
      recentVouchers,
    }
  }
})
