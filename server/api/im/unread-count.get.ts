import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { imMessages, imMembers, imReadCursors, imConversations } from '#schema'
import { eq, and, isNull, ne, sql, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // 聚合未读数：用户在会话里，消息不是自己发的，且消息在已读游标之后（或无游标）
  const rows = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(imMessages)
    .innerJoin(imConversations, eq(imMessages.conversationId, imConversations.id))
    .innerJoin(
      imMembers,
      and(eq(imMembers.conversationId, imMessages.conversationId), eq(imMembers.userId, user.userId)),
    )
    .leftJoin(
      imReadCursors,
      and(
        eq(imReadCursors.conversationId, imMessages.conversationId),
        eq(imReadCursors.userId, user.userId),
      ),
    )
    .where(and(
      ne(imMessages.senderId, user.userId),
      isNull(imMessages.deletedAt),
      isNull(imConversations.deletedAt),
      sql`(${imReadCursors.updatedAt} IS NULL OR ${imMessages.createdAt} > ${imReadCursors.updatedAt})`,
    ))

  return { code: 0, data: { count: rows[0]?.cnt ?? 0 } }
})
