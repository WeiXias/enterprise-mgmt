import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { opportunities, customers, users } from '#schema'
import { eq, like, and, isNull, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const status = query.status as string | undefined
  const customerId = query.customerId as string | undefined

  const where: any[] = [isNull(opportunities.deletedAt)]
  if (keyword) where.push(like(opportunities.name, `%${keyword}%`))
  if (status) where.push(eq(opportunities.status, status))
  if (customerId) where.push(eq(opportunities.customerId, customerId))
  // 销售成员只能看自己的商机
  if (user.role === 'sales_member') where.push(eq(opportunities.ownerUserId, user.userId))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: opportunities.id,
      name: opportunities.name,
      estimatedAmount: opportunities.estimatedAmount,
      estimatedCloseDate: opportunities.estimatedCloseDate,
      status: opportunities.status,
      customerId: opportunities.customerId,
      customerName: customers.name,
      ownerUserId: opportunities.ownerUserId,
      ownerName: users.name,
      source: opportunities.source,
      createdAt: opportunities.createdAt,
      updatedAt: opportunities.updatedAt,
    }).from(opportunities)
      .leftJoin(customers, eq(opportunities.customerId, customers.id))
      .leftJoin(users, eq(opportunities.ownerUserId, users.id))
      .where(and(...where))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(desc(opportunities.updatedAt)),
    db.select({ count: count() }).from(opportunities).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((o: any) => ({
        id: o.id,
        name: o.name,
        customer: { id: o.customerId, name: o.customerName },
        owner: { id: o.ownerUserId, name: o.ownerName },
        estimatedAmount: o.estimatedAmount,
        estimatedCloseDate: o.estimatedCloseDate,
        source: o.source,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      total, page, pageSize, totalPages: Math.ceil(total / pageSize),
    }
  }
})
