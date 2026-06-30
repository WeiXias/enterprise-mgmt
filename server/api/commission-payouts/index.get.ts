import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { commissionPayouts, users } from '#schema'
import { eq, count, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'commission-payout:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const [list, totalResult] = await Promise.all([
    db.select({
      id: commissionPayouts.id,
      periodMonth: commissionPayouts.periodMonth,
      totalAmount: commissionPayouts.totalAmount,
      status: commissionPayouts.status,
      paidAt: commissionPayouts.paidAt,
      remark: commissionPayouts.remark,
      createdBy: commissionPayouts.createdBy,
      creatorName: users.name,
      createdAt: commissionPayouts.createdAt,
    }).from(commissionPayouts)
      .leftJoin(users, eq(commissionPayouts.createdBy, users.id))
      .limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(commissionPayouts.createdAt)),
    db.select({ count: count() }).from(commissionPayouts),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list,
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
