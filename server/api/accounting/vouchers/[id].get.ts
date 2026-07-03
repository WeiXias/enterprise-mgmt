import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { vouchers, voucherEntries, accounts, users } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

const accountingModels = { accounts, users }

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const { id } = getRouterParams(event)

  const voucher = await db.select({
    id: vouchers.id,
    voucherNo: vouchers.voucherNo,
    voucherDate: vouchers.voucherDate,
    summary: vouchers.summary,
    status: vouchers.status,
    sourceType: vouchers.sourceType,
    sourceId: vouchers.sourceId,
    periodId: vouchers.periodId,
    attachments: vouchers.attachments,
    preparedBy: vouchers.preparedBy,
    creatorName: users.name,
    reviewedBy: vouchers.reviewedBy,
    approvedBy: vouchers.approvedBy,
    reviewedAt: vouchers.reviewedAt,
    approvedAt: vouchers.approvedAt,
    postedAt: vouchers.postedAt,
    createdAt: vouchers.createdAt,
  }).from(vouchers)
    .leftJoin(users, eq(vouchers.preparedBy, users.id))
    .where(eq(vouchers.id, id)).limit(1)

  if (voucher.length === 0) return { code: 0, data: null }

  const entries = await db.select({
    id: voucherEntries.id,
    voucherId: voucherEntries.voucherId,
    accountId: voucherEntries.accountId,
    accountCode: accounts.code,
    accountName: accounts.name,
    summary: voucherEntries.summary,
    debitAmount: voucherEntries.debitAmount,
    creditAmount: voucherEntries.creditAmount,
    contractId: voucherEntries.contractId,
    projectId: voucherEntries.projectId,
    customerId: voucherEntries.customerId,
    supplierId: voucherEntries.supplierId,
    sort: voucherEntries.sort,
  }).from(voucherEntries)
    .leftJoin(accounts, eq(voucherEntries.accountId, accounts.id))
    .where(eq(voucherEntries.voucherId, id))
    .orderBy(voucherEntries.sort)

  return { code: 0, data: { ...voucher[0], entries } }
})
