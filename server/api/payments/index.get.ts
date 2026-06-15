import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { payments, contracts } from '#schema'
import { eq, and, isNull, desc, count, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(payments.deletedAt)]
  if (query.contractId) where.push(eq(payments.contractId, query.contractId as string))
  if (query.keyword) where.push(like(contracts.name, `%${query.keyword}%`))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: payments.id,
      contractId: payments.contractId,
      contractCode: contracts.code,
      contractName: contracts.name,
      paymentPlanId: payments.paymentPlanId,
      amount: payments.amount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      remark: payments.remark,
      createdBy: payments.createdBy,
      createdAt: payments.createdAt,
    }).from(payments)
      .leftJoin(contracts, eq(payments.contractId, contracts.id))
      .where(and(...where))
      .orderBy(desc(payments.paymentDate))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(payments).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map(p => ({ ...p, amount: Number(p.amount) })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
