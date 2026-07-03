import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { accountBalances, accounts } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const periodId = query.periodId as string
  if (!periodId) return { code: 0, data: { items: [], summary: { totalDebit: 0, totalCredit: 0 } } }

  const rows = await db.select({
    id: accountBalances.id,
    accountId: accountBalances.accountId,
    accountCode: accounts.code,
    accountName: accounts.name,
    categoryType: accounts.categoryType,
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
    data: {
      items: rows,
      summary: { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 1 }
    }
  }
})
