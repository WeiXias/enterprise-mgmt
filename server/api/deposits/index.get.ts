import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { payments, customers } from '#schema'
import { eq, and, isNull, desc, count, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(payments.deletedAt), eq(payments.type, 'deposit')]
  if (query.customerId) where.push(eq(payments.customerId, query.customerId as string))
  if (query.keyword) where.push(like(customers.name, `%${query.keyword}%`))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: payments.id,
      customerId: payments.customerId,
      customerName: customers.name,
      contractId: payments.contractId,
      amount: payments.amount,
      remainingAmount: payments.remainingAmount,
      paymentDate: payments.paymentDate,
      paymentMethod: payments.paymentMethod,
      remark: payments.remark,
      refundedAt: payments.refundedAt,
      reconciledAt: payments.reconciledAt,
      createdAt: payments.createdAt,
    }).from(payments)
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .where(and(...where))
      .orderBy(desc(payments.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(payments).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map(p => ({
        ...p,
        amount: Number(p.amount),
        remainingAmount: p.remainingAmount != null ? Number(p.remainingAmount) : null,
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
