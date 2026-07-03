import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { vouchers, voucherEntries, accounts } from '#schema'
import { eq, and, isNull, gte, lte, inArray } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const accountId = query.accountId as string
  const startDate = query.startDate as string
  const endDate = query.endDate as string

  if (!accountId) return { code: 0, data: { account: null, entries: [], periodSummary: { openingBalance: 0, totalDebit: 0, totalCredit: 0, closingBalance: 0 } } }

  const account = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1)
  if (account.length === 0) return { code: 0, data: null }

  const where: any[] = [
    eq(voucherEntries.accountId, accountId),
    isNull(vouchers.deletedAt),
    eq(vouchers.status, 'posted' as any),
  ]
  if (startDate) where.push(gte(vouchers.voucherDate, startDate))
  if (endDate) where.push(lte(vouchers.voucherDate, endDate))

  const entries = await db.select({
    voucherId: voucherEntries.voucherId,
    voucherNo: vouchers.voucherNo,
    voucherDate: vouchers.voucherDate,
    voucherSummary: vouchers.summary,
    accountCode: accounts.code,
    accountName: accounts.name,
    debitAmount: voucherEntries.debitAmount,
    creditAmount: voucherEntries.creditAmount,
    summary: voucherEntries.summary,
  }).from(voucherEntries)
    .leftJoin(vouchers, eq(voucherEntries.voucherId, vouchers.id))
    .leftJoin(accounts, eq(voucherEntries.accountId, accounts.id))
    .where(and(...where))
    .orderBy(vouchers.voucherDate)
    .limit(1000)

  let totalDebit = 0, totalCredit = 0
  for (const e of entries) {
    totalDebit += Number(e.debitAmount)
    totalCredit += Number(e.creditAmount)
  }

  const acc = account[0]
  const isDebitDir = acc.balanceDirection === 'debit'
  const closingBalance = isDebitDir ? totalDebit - totalCredit : totalCredit - totalDebit

  return {
    code: 0,
    data: {
      account: acc,
      entries: entries.map((e: any) => ({ ...e, voucherId: undefined })),
      periodSummary: {
        openingBalance: 0,
        totalDebit,
        totalCredit,
        closingBalance: Math.abs(closingBalance),
        closingDirection: closingBalance >= 0 ? (isDebitDir ? '借' : '贷') : (isDebitDir ? '贷' : '借'),
      }
    }
  }
})
