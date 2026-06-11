import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, users } from '#schema'
import { eq, and, isNull, ne } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  // 验证用户是成员
  const membership = await db.select({ id: imMembers.id })
    .from(imMembers)
    .where(and(eq(imMembers.conversationId, id), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (membership.length === 0) {
    throw createError({ statusCode: 403, statusMessage: '无权查看此会话' })
  }

  const conv = await db.select({
    id: imConversations.id,
    type: imConversations.type,
    createdAt: imConversations.createdAt,
  })
    .from(imConversations)
    .where(and(eq(imConversations.id, id), isNull(imConversations.deletedAt)))
    .limit(1)

  if (conv.length === 0) throw createError({ statusCode: 404, statusMessage: '会话不存在' })

  // 对方信息
  const other = await db.select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
    .innerJoin(imMembers, eq(imMembers.userId, users.id))
    .where(and(eq(imMembers.conversationId, id), ne(imMembers.userId, user.userId)))
    .limit(1)

  return {
    code: 0,
    data: {
      ...conv[0],
      participant: other[0] || null,
    },
  }
})
