import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { paymentPlans, contracts } from '#schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(paymentPlans.deletedAt)]
  if (query.contractId) where.push(eq(paymentPlans.contractId, query.contractId as string))
  if (query.status) where.push(eq(paymentPlans.status, query.status as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: paymentPlans.id,
      contractId: paymentPlans.contractId,
      contractCode: contracts.code,
      contractName: contracts.name,
      amount: paymentPlans.amount,
      planDate: paymentPlans.planDate,
      status: paymentPlans.status,
      remark: paymentPlans.remark,
      createdAt: paymentPlans.createdAt,
    }).from(paymentPlans)
      .leftJoin(contracts, eq(paymentPlans.contractId, contracts.id))
      .where(and(...where))
      .orderBy(desc(paymentPlans.planDate))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(paymentPlans).where(and(...where)),
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
