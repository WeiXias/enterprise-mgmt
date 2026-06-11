import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { comments, users } from '#schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)

  const list = await db.select({
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
    .where(and(
      eq(comments.targetType, 'project'),
      eq(comments.targetId, projectId),
      isNull(comments.deletedAt),
    ))
    .orderBy(asc(comments.createdAt))

  return { code: 0, data: list }
})
