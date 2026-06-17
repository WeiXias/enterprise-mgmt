import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { reconciliations, customers } from '#schema'
import { eq, and, isNull, desc, count, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(reconciliations.deletedAt)]
  if (query.customerId) where.push(eq(reconciliations.customerId, query.customerId as string))
  if (query.status) where.push(eq(reconciliations.status, query.status as string))
  if (query.keyword) where.push(like(customers.name, `%${query.keyword}%`))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: reconciliations.id,
      code: reconciliations.code,
      customerId: reconciliations.customerId,
      customerName: customers.name,
      contractId: reconciliations.contractId,
      periodStart: reconciliations.periodStart,
      periodEnd: reconciliations.periodEnd,
      openingAmount: reconciliations.openingAmount,
      contractAmount: reconciliations.contractAmount,
      receivedAmount: reconciliations.receivedAmount,
      closingAmount: reconciliations.closingAmount,
      status: reconciliations.status,
      remark: reconciliations.remark,
      confirmedAt: reconciliations.confirmedAt,
      createdAt: reconciliations.createdAt,
    }).from(reconciliations)
      .leftJoin(customers, eq(reconciliations.customerId, customers.id))
      .where(and(...where))
      .orderBy(desc(reconciliations.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(reconciliations).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map(r => ({
        ...r,
        openingAmount: Number(r.openingAmount),
        contractAmount: Number(r.contractAmount),
        receivedAmount: Number(r.receivedAmount),
        closingAmount: Number(r.closingAmount),
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
