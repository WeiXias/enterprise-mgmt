import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { commissions, users, contracts } from '#schema'
import { and, isNull, count, desc, eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'commission:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const where: any[] = [isNull(commissions.deletedAt)]
  if (user.role === 'sales_member') where.push(eq(commissions.userId, user.userId))
  const [list, totalResult] = await Promise.all([
    db.select({ id: commissions.id, userName: users.name, contractCode: contracts.code,
      baseAmount: commissions.baseAmount, rate: commissions.rate, amount: commissions.amount,
      adjustAmount: commissions.adjustAmount, status: commissions.status,
    }).from(commissions).leftJoin(users, eq(commissions.userId, users.id))
      .leftJoin(contracts, eq(commissions.contractId, contracts.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(commissions.createdAt)),
    db.select({ count: count() }).from(commissions).where(and(...where)),
  ])
  return { code: 0, data: { items: list, total: Number(totalResult[0]?.count || 0), page, pageSize, totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / pageSize) } }
})