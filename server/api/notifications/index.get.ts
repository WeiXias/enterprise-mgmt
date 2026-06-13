import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { notifications } from '#schema/users'
import { users } from '#schema/users'
import { eq, and, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '请先登录' })
  }

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const isReadVal = query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined

  const where: any[] = [eq(notifications.userId, user.userId)]
  if (isReadVal !== undefined) where.push(eq(notifications.isRead, isReadVal))

  const [list, totalResult] = await Promise.all([
    db.select().from(notifications).where(and(...where))
      .limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(notifications.createdAt)),
    db.select({ count: sql`count(*)` }).from(notifications).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
