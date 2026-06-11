import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imMessages, users } from '#schema'
import { eq, and, isNull, ne, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  // 获取用户参与的会话
  const conList = await db.select({
    id: imConversations.id,
    type: imConversations.type,
    title: imConversations.title,
    createdAt: imConversations.createdAt,
    updatedAt: imConversations.updatedAt,
    participantId: users.id,
    participantName: users.name,
    participantAvatar: users.avatar,
  })
    .from(imConversations)
    .innerJoin(imMembers, and(
      eq(imMembers.conversationId, imConversations.id),
      ne(imMembers.userId, user.userId),
    ))
    .innerJoin(users, eq(imMembers.userId, users.id))
    .where(and(
      isNull(imConversations.deletedAt),
      eq(imConversations.type, 'direct'),
      sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imConversations.id} AND user_id = ${user.userId})`,
    ))
    .orderBy(desc(imConversations.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // 群聊列表（单独查，去重 - 用 groupBy 代替 selectDistinct）
  const groupList = await db.select({
    id: imConversations.id,
    type: imConversations.type,
    title: imConversations.title,
    createdAt: imConversations.createdAt,
    updatedAt: imConversations.updatedAt,
  })
    .from(imConversations)
    .where(and(
      eq(imConversations.type, 'group'),
      isNull(imConversations.deletedAt),
      sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imConversations.id} AND user_id = ${user.userId})`,
    ))
    .groupBy(imConversations.id)
    .orderBy(desc(imConversations.updatedAt))

  const allConversations = [...conList.map(c => ({ ...c, title: null })), ...groupList.map(c => ({ ...c, participantId: null as string | null, participantName: null as string | null, participantAvatar: null as string | null }))]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, pageSize)

  // 获取总数
  const totalRes = await db.select({ total: sql<number>`COUNT(*)`.as('total') })
    .from(imConversations)
    .where(and(
      isNull(imConversations.deletedAt),
      sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imConversations.id} AND user_id = ${user.userId})`,
    ))
  const total = totalRes[0]?.total ?? 0

  // 为每个会话获取最后一条消息和未读数
  const items = await Promise.all(allConversations.map(async c => {
    // 最后一条消息
    const lastMsgs = await db.select({
      content: imMessages.content,
      senderName: users.name,
      createdAt: imMessages.createdAt,
    })
      .from(imMessages)
      .leftJoin(users, eq(imMessages.senderId, users.id))
      .where(and(eq(imMessages.conversationId, c.id), isNull(imMessages.deletedAt)))
      .orderBy(desc(imMessages.createdAt))
      .limit(1)

    // 未读数
    const unreadRes = await db.select({ cnt: sql<number>`COUNT(*)`.as('cnt') })
      .from(imMessages)
      .where(and(
        eq(imMessages.conversationId, c.id),
        ne(imMessages.senderId, user.userId),
        isNull(imMessages.deletedAt),
        sql`NOT EXISTS (
          SELECT 1 FROM im_read_cursors
          WHERE conversation_id = ${c.id}
          AND user_id = ${user.userId}
          AND updated_at >= ${imMessages.createdAt}
        )`,
      ))

    // 群聊取 memberCount
    let memberCount = null
    if (c.type === 'group') {
      const cnt = await db.select({ cnt: sql<number>`COUNT(*)`.as('cnt') })
        .from(imMembers)
        .where(eq(imMembers.conversationId, c.id))
      memberCount = cnt[0]?.cnt ?? 0
    }

    return {
      id: c.id,
      type: c.type as string,
      title: c.title,
      memberCount,
      participant: c.type === 'group' ? null : { id: c.participantId, name: c.participantName, avatar: c.participantAvatar },
      lastMessage: lastMsgs.length > 0 ? {
        content: lastMsgs[0].content,
        senderName: lastMsgs[0].senderName || '未知',
        createdAt: lastMsgs[0].createdAt,
      } : null,
      unreadCount: unreadRes[0]?.cnt ?? 0,
    }
  }))

  return {
    code: 0,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})
