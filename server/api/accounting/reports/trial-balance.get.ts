import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { accounts, accountBalances } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const periodId = query.periodId as string | undefined

  if (!periodId) {
    // 返回所有科目的期初+本期+期末
    const allAccounts = await db.select().from(accounts).orderBy(accounts.code)
    return { code: 0, data: { items: allAccounts, summary: { totalDebit: 0, totalCredit: 0, isBalanced: true } } }
  }

  // 有期间时返回余额
  const rows = await db.select({
    accountId: accountBalances.accountId,
    accountCode: accounts.code,
    accountName: accounts.name,
    categoryType: accounts.categoryType,
    balanceDirection: accounts.balanceDirection,
    openingDebit: accountBalances.openingDebit,
    openingCredit: accountBalances.openingCredit,
    periodDebit: accountBalances.periodDebit,
    periodCredit: accountBalances.periodCredit,
    closingDebit: accountBalances.closingDebit,
    closingCredit: accountBalances.closingCredit,
  }).from(accountBalances)
    .leftJoin(accounts, eq(accountBalances.accountId, accounts.id))
    .where(eq(accountBalances.periodId, periodId))
    .orderBy(accounts.code)

  let totalDebit = 0, totalCredit = 0
  for (const r of rows) {
    totalDebit += Number(r.periodDebit)
    totalCredit += Number(r.periodCredit)
  }

  return {
    code: 0,
    data: { items: rows, summary: { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 1 } }
  }
})
