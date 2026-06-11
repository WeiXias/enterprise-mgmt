import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { followUps } from '#schema/customers'
import { users } from '#schema/users'
import { eq, and, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: customerId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where = eq(followUps.customerId, customerId)

  const [list, totalResult] = await Promise.all([
    db.select({
      id: followUps.id, type: followUps.type, content: followUps.content,
      nextFollowUpAt: followUps.nextFollowUpAt,
      userName: users.name, userId: followUps.userId,
      createdAt: followUps.createdAt,
    }).from(followUps)
      .leftJoin(users, eq(followUps.userId, users.id))
      .where(where).limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(followUps.createdAt)),
    db.select({ total: count() }).from(followUps).where(where),
  ])

  return {
    code: 0,
    data: {
      items: list.map(f => ({
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
