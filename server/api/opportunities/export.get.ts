import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { opportunities, customers, users } from '#schema'
import { and, isNull, like, count, desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const pageSize = 1000 // 导出时一次取完

  const where: ReturnType<typeof isNull>[] = [isNull(opportunities.deletedAt)]
  if (query.keyword) where.push(like(opportunities.name, `%${query.keyword}%`))
  if (user.role === 'sales_member') where.push(eq(opportunities.ownerUserId, user.userId))

  const list = await db.select({
    id: opportunities.id,
    name: opportunities.name,
    estimatedAmount: opportunities.estimatedAmount,
    status: opportunities.status,
    customerName: customers.name,
    ownerName: users.name,
    estimatedCloseDate: opportunities.estimatedCloseDate,
    createdAt: opportunities.createdAt,
  }).from(opportunities)
    .leftJoin(customers, eq(opportunities.customerId, customers.id))
    .leftJoin(users, eq(opportunities.ownerUserId, users.id))
    .where(and(...where)).limit(pageSize).orderBy(desc(opportunities.updatedAt))

  return { code: 0, data: { items: list, format: 'json' } }
})
