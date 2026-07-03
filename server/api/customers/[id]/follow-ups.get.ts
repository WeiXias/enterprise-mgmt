import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { followUps, customers } from '#schema/customers'
import { users } from '#schema/users'
import { eq, and, asc, desc, count, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'follow-up:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: customerId } = getRouterParams(event)

  // 校验客户存在
  const [customerExists] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), isNull(customers.deletedAt)))
  if (!customerExists) throw createError({ statusCode: 404, statusMessage: '客户不存在' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    createdAt: followUps.createdAt,
    type: followUps.type,
  }
  const orderColumn = sortColumns[sortBy] || followUps.createdAt

  const where = and(eq(followUps.customerId, customerId), isNull(followUps.deletedAt))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: followUps.id, type: followUps.type, content: followUps.content,
      nextFollowUpAt: followUps.nextFollowUpAt,
      userName: users.name, userId: followUps.userId,
      createdAt: followUps.createdAt,
    }).from(followUps)
      .leftJoin(users, eq(followUps.userId, users.id))
      .where(where).limit(pageSize).offset((page - 1) * pageSize).orderBy(orderFn(orderColumn)),
    db.select({ total: count() }).from(followUps).where(where),
  ])

  return {
    code: 0,
    data: {
      items: list.map((f: any) => ({
        id: f.id, type: f.type, content: f.content,
        nextFollowUpAt: f.nextFollowUpAt,
        user: { id: f.userId, name: f.userName },
        createdAt: f.createdAt,
      })),
      total: Number(totalResult[0]?.total || 0), page, pageSize,
      totalPages: Math.ceil(Number(totalResult[0]?.total || 0) / pageSize),
    }
  }
})
