import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imMessages, users } from '#schema'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'

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

  const totalRes = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(imMessages)
    .where(eq(imMessages.conversationId, convId))
  const total = totalRes[0]?.cnt ?? 0
  const totalPages = Math.ceil(total / pageSize)

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
    replyTo: imMessages.replyTo,
    createdAt: imMessages.createdAt,
  })
    .from(imMessages)
    .leftJoin(users, eq(imMessages.senderId, users.id))
    .where(eq(imMessages.conversationId, convId))
    .orderBy(desc(imMessages.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // 批量查引用消息
  const replyIds = rows.map((m: any) => m.replyTo).filter(Boolean) as string[]
  const replyMap = new Map<string, { content: string | null; sender: { id: string; name: string } | null }>()
  if (replyIds.length > 0) {
    const replyMsgs = await db.select({
      id: imMessages.id,
      content: imMessages.content,
      isDeleted: sql<number>`CASE WHEN ${imMessages.deletedAt} IS NOT NULL THEN 1 ELSE 0 END`.as('is_deleted'),
      senderId: imMessages.senderId,
      senderName: users.name,
    })
      .from(imMessages)
      .leftJoin(users, eq(imMessages.senderId, users.id))
      .where(inArray(imMessages.id, replyIds))
    for (const r of replyMsgs) {
      replyMap.set(r.id, {
        content: r.isDeleted ? null : r.content,
        sender: r.senderName ? { id: r.senderId, name: r.senderName } : null,
      })
    }
  }

  return {
    code: 0,
    data: {
      items: rows.map((m: any) => ({
        id: m.id,
        conversationId: m.conversationId,
        type: (m.type as string) || 'text',
        sender: m.sender?.name ? m.sender : { id: m.sender?.id || '', name: '已注销用户', avatar: null },
        content: m.content,
        isDeleted: !!(m.isDeleted as unknown),
        mentions: m.mentions ? (() => { try { return JSON.parse(m.mentions as string) } catch { return null } })() : null,
        replyTo: m.replyTo ? replyMap.get(m.replyTo) || null : null,
        createdAt: m.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages,
    },
  }
})
