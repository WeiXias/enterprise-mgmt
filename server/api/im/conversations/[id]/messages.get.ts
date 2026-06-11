import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imMessages, users } from '#schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)

  // 验证用户是成员
  const member = await db.select({ id: imMembers.id })
    .from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (member.length === 0) {
    throw createError({ statusCode: 403, statusMessage: '无权查看此会话' })
  }

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(Number(query.pageSize) || 50, 100)

  // 消息按时间正序（旧→新），前端从最新页开始加载
  const totalRes = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(imMessages)
    .where(and(eq(imMessages.conversationId, convId), isNull(imMessages.deletedAt)))
  const total = totalRes[0]?.cnt ?? 0
  const totalPages = Math.ceil(total / pageSize)

  // 前端希望最新页在最前 — 前端翻页时传 page 越大=越新
  // 这里用标准分页，ASC 序
  const rows = await db.select({
    id: imMessages.id,
    conversationId: imMessages.conversationId,
    sender: {
      id: users.id,
      name: users.name,
      avatar: users.avatar,
    },
    content: imMessages.content,
    type: imMessages.type,
    isDeleted: sql<number>`CASE WHEN ${imMessages.deletedAt} IS NOT NULL THEN 1 ELSE 0 END`.as('is_deleted'),
    mentions: imMessages.mentions,
    createdAt: imMessages.createdAt,
  })
    .from(imMessages)
    .leftJoin(users, eq(imMessages.senderId, users.id))
    .where(and(eq(imMessages.conversationId, convId), isNull(imMessages.deletedAt)))
    .orderBy(desc(imMessages.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  return {
    code: 0,
    data: {
      items: rows.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        type: (m.type as string) || 'text',
        sender: m.sender?.name ? m.sender : { id: m.sender?.id || '', name: '已注销用户', avatar: null },
        content: m.content,
        isDeleted: !!(m.isDeleted as unknown),
        mentions: m.mentions ? (() => { try { return JSON.parse(m.mentions as string) } catch { return null } })() : null,
        createdAt: m.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages,
    },
  }
})
