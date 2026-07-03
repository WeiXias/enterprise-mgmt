import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { vouchers, voucherEntries, accounts, users } from '#schema'
import { eq, and, isNull, like, gte, lte, count, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(vouchers.deletedAt)]
  if (query.status) where.push(eq(vouchers.status, query.status as string))
  if (query.startDate) where.push(gte(vouchers.voucherDate, query.startDate as string))
  if (query.endDate) where.push(lte(vouchers.voucherDate, query.endDate as string))
  if (query.keyword) where.push(like(vouchers.summary, `%${query.keyword}%`))
  if (query.periodId) where.push(eq(vouchers.periodId, query.periodId as string))
  if (query.sourceType) where.push(eq(vouchers.sourceType, query.sourceType as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: vouchers.id,
      voucherNo: vouchers.voucherNo,
      voucherDate: vouchers.voucherDate,
      summary: vouchers.summary,
      status: vouchers.status,
      sourceType: vouchers.sourceType,
      sourceId: vouchers.sourceId,
      periodId: vouchers.periodId,
      preparedBy: vouchers.preparedBy,
      createdBy: { id: users.id, name: users.name },
      reviewedBy: vouchers.reviewedBy,
      approvedBy: vouchers.approvedBy,
      reviewedAt: vouchers.reviewedAt,
      approvedAt: vouchers.approvedAt,
      postedAt: vouchers.postedAt,
      createdAt: vouchers.createdAt,
    }).from(vouchers)
      .leftJoin(users, eq(vouchers.preparedBy, users.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(vouchers.voucherDate), desc(vouchers.createdAt)),
    db.select({ count: count() }).from(vouchers).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }
})
