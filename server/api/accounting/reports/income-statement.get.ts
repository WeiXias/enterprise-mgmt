import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { accounts, accountBalances } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const periodId = query.periodId as string

  if (!periodId) return { code: 0, data: { revenue: [], expense: [], totals: { totalRevenue: 0, totalExpense: 0, netProfit: 0 } } }

  const balances = await db.select({
    accountCode: accounts.code,
    accountName: accounts.name,
    categoryType: accounts.categoryType,
    balanceDirection: accounts.balanceDirection,
    closingDebit: accountBalances.closingDebit,
    closingCredit: accountBalances.closingCredit,
  }).from(accountBalances)
    .leftJoin(accounts, eq(accountBalances.accountId, accounts.id))
    .where(eq(accountBalances.periodId, periodId))

  // 收入类：贷方余额科目（5001, 5051, 5111, 5301）
  const revenueCodes = ['5001', '5051', '5111', '5301']
  const revenue = balances
    .filter(b => revenueCodes.some(prefix => b.accountCode?.startsWith(prefix)))
    .map(b => ({
      code: b.accountCode,
      name: b.accountName,
      amount: Number(b.closingCredit) - Number(b.closingDebit),
    }))
    .filter(b => b.amount !== 0)

  // 费用类：借方余额科目（5401-5801）
  const expenseCodes = ['5401', '5402', '5403', '5501', '5601', '5602', '5711', '5801']
  const expense = balances
    .filter(b => expenseCodes.some(prefix => b.accountCode?.startsWith(prefix)))
    .map(b => ({
      code: b.accountCode,
      name: b.accountName,
      amount: Number(b.closingDebit) - Number(b.closingCredit),
    }))
    .filter(b => b.amount !== 0)

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0)
  const netProfit = totalRevenue - totalExpense

  return {
    code: 0,
    data: {
      revenue,
      expense,
      totals: { totalRevenue, totalExpense, netProfit },
    }
  }
})
