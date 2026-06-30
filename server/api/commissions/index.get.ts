import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { commissions, users, contracts } from '#schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'commission:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = []
  if (query.userId) where.push(eq(commissions.userId, query.userId as string))
  if (query.status) where.push(eq(commissions.status, query.status as string))
  if (query.contractId) where.push(eq(commissions.contractId, query.contractId as string))
  if (user.role === 'sales_member') where.push(eq(commissions.userId, user.userId))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: commissions.id, userId: commissions.userId, userName: users.name,
      contractId: commissions.contractId, contractCode: contracts.code, contractName: contracts.name,
      baseAmount: commissions.baseAmount, rate: commissions.rate, amount: commissions.amount,
      adjustAmount: commissions.adjustAmount, adjustReason: commissions.adjustReason,
      status: commissions.status, periodMonth: commissions.periodMonth,
      createdAt: commissions.createdAt,
    }).from(commissions)
      .leftJoin(users, eq(commissions.userId, users.id))
      .leftJoin(contracts, eq(commissions.contractId, contracts.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(commissions.createdAt)),
    db.select({ count: count() }).from(commissions).where(and(...where)),
  ])
  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((c: any) => ({
        ...c,
        user: { id: c.userId, name: c.userName },
        contract: { id: c.contractId, code: c.contractCode, name: c.contractName },
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
