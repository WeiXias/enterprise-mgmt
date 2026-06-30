import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { comments, users } from '#schema'
import { eq, and, isNull, asc, desc, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'comment:read')
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 200)
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'asc'
  const sortFn = sortOrder === 'asc' ? asc : desc

  const where = and(
    eq(comments.targetType, 'project'),
    eq(comments.targetId, projectId),
    isNull(comments.deletedAt),
  )

  const [list, totalResult] = await Promise.all([
    db.select({
      id: comments.id,
      targetType: comments.targetType,
      targetId: comments.targetId,
      userId: comments.userId,
      userName: users.name,
      userAvatar: users.avatar,
      content: comments.content,
      parentId: comments.parentId,
      mentions: comments.mentions,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(where).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(sortFn(comments[sortBy as keyof typeof comments] || comments.createdAt)),
    db.select({ count: count() }).from(comments).where(where),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
