import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { vouchers, voucherEntries, accounts } from '#schema'
import { eq, and, isNull, gte, lte, inArray } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const accountId = query.accountId as string
  const periodId = query.periodId as string
  const startDate = query.startDate as string
  const endDate = query.endDate as string

  const where: any[] = [isNull(vouchers.deletedAt), eq(vouchers.status, 'posted' as any)]

  if (periodId) where.push(eq(vouchers.periodId, periodId))
  if (startDate) where.push(gte(vouchers.voucherDate, startDate))
  if (endDate) where.push(lte(vouchers.voucherDate, endDate))

  if (accountId) {
    const voucherIdRows = await db.select({ voucherId: voucherEntries.voucherId }).from(voucherEntries)
      .where(eq(voucherEntries.accountId, accountId)).all()
    const voucherIds = voucherIdRows.map((r: any) => r.voucherId)
    if (voucherIds.length > 0) {
      where.push(inArray(vouchers.id, voucherIds))
    } else {
      return { code: 0, data: { items: [] } }
    }
  }

  const rows = await db.select({
    id: vouchers.id,
    voucherNo: vouchers.voucherNo,
    voucherDate: vouchers.voucherDate,
    summary: vouchers.summary,
    status: vouchers.status,
    postedAt: vouchers.postedAt,
  }).from(vouchers)
    .where(and(...where))
    .orderBy(vouchers.voucherDate)
    .limit(500)

  const ids = rows.map(r => r.id)
  if (ids.length === 0) return { code: 0, data: { items: [] } }

  const allEntries = await db.select({
    voucherId: voucherEntries.voucherId,
    accountCode: accounts.code,
    accountName: accounts.name,
    debitAmount: voucherEntries.debitAmount,
    creditAmount: voucherEntries.creditAmount,
    summary: voucherEntries.summary,
  }).from(voucherEntries)
    .leftJoin(accounts, eq(voucherEntries.accountId, accounts.id))
    .where(inArray(voucherEntries.voucherId, ids))
    .orderBy(voucherEntries.sort)

  // 如果有 accountId 过滤，需要筛选
  const filtered = accountId
    ? allEntries.filter((e: any) => {
        const acc = rows.find(v => v.id === e.voucherId)
        return acc && e  // 保留全部分录，因为总账应显示每条分录
      })
    : allEntries

  const items = rows.map(v => ({
    ...v,
    entries: filtered.filter((e: any) => e.voucherId === v.id),
  }))

  return { code: 0, data: { items } }
})
