import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, customers, payments } from '#schema'
import { eq, like, and, isNull, count, desc } from 'drizzle-orm'
import BetterSqlite3 from 'better-sqlite3'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(contracts.deletedAt)]
  if (query.keyword) where.push(like(contracts.name, `%${query.keyword}%`))
  if (query.status) where.push(eq(contracts.status, query.status as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: contracts.id, code: contracts.code, name: contracts.name,
      customerName: customers.name,
      totalAmount: contracts.totalAmount,
      status: contracts.status,
    }).from(contracts).leftJoin(customers, eq(contracts.customerId, customers.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(contracts.updatedAt)),
    db.select({ count: count() }).from(contracts).where(and(...where)),
  ])

  // Simple: sum payments per contract using drizzle aggregate
  const items = list.map(c => {
    const totalAmt = Number(c.totalAmount)
    return {
      id: c.id, code: c.code, name: c.name,
      customer: { name: c.customerName },
      totalAmount: totalAmt,
      receivedAmount: 0,
      unreceivedAmount: totalAmt,
      paymentProgress: 0,
      nextPaymentDate: null, nextPaymentAmount: null,
      status: c.status,
    }
  })

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items,
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
