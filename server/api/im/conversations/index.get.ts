import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imMessages, users, imReadCursors } from '#schema'
import { eq, and, isNull, ne, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  // 用户参与的私聊会话（含对方信息和最后消息）
  const directCons = await db.select({
    id: imConversations.id,
    type: imConversations.type,
    title: imConversations.title,
    createdAt: imConversations.createdAt,
    updatedAt: imConversations.updatedAt,
    participantId: users.id,
    participantName: users.name,
    participantAvatar: users.avatar,
    lastMsgContent: imMessages.content,
    lastMsgSenderName: sql<string>`msg_sender.name`.as('last_msg_sender_name'),
    lastMsgCreatedAt: imMessages.createdAt,
  })
    .from(imConversations)
    .innerJoin(imMembers, eq(imMembers.conversationId, imConversations.id))
    .innerJoin(users, eq(imMembers.userId, users.id))
    .leftJoin(
      db.select({
        id: imMessages.id,
        conversationId: imMessages.conversationId,
        content: imMessages.content,
        senderId: imMessages.senderId,
        createdAt: imMessages.createdAt,
        rowNum: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${imMessages.conversationId} ORDER BY ${imMessages.createdAt} DESC)`.as('rn'),
      }).from(imMessages).where(isNull(imMessages.deletedAt)).as('last_msg'),
      and(
        eq(sql`last_msg.conversationId`, imConversations.id),
        eq(sql`last_msg.rn`, 1),
      ),
    )
    .leftJoin(sql`users AS msg_sender`, eq(sql`last_msg.senderId`, sql`msg_sender.id`))
    .where(and(
      isNull(imConversations.deletedAt),
      eq(imConversations.type, 'direct'),
      ne(imMembers.userId, user.userId),
      sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imConversations.id} AND user_id = ${user.userId})`,
    ))
    .orderBy(desc(imConversations.updatedAt))

  // 用户参与的群聊
  const groupCons = await db.select({
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

  // 收集所有会话 ID 做批量查询
  const directIds = directCons.map((c: any) => c.id)
  const groupIds = groupCons.map((c: any) => c.id)
  const allConvIds = [...directIds, ...groupIds]

  // 批量查群聊最后消息
  const groupLastMsgs = allConvIds.length > 0
    ? await db.select({
        conversationId: imMessages.conversationId,
        content: imMessages.content,
        senderName: users.name,
        createdAt: imMessages.createdAt,
        rowNum: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${imMessages.conversationId} ORDER BY ${imMessages.createdAt} DESC)`.as('rn'),
      })
        .from(imMessages)
        .leftJoin(users, eq(imMessages.senderId, users.id))
        .where(and(
          sql`${imMessages.conversationId} IN (${sql.join(allConvIds.map(id => sql`${id}`), sql`, `)})`,
          isNull(imMessages.deletedAt),
        ))
    : []
  const groupLastMsgMap = new Map<string, { content: string; senderName: string | null; createdAt: string }>()
  for (const m of groupLastMsgs) {
    if ((m.rn as number) === 1) groupLastMsgMap.set(m.conversationId, { content: m.content, senderName: m.senderName, createdAt: m.createdAt })
  }

  // 批量查未读数
  const unreadCounts = allConvIds.length > 0
    ? await db.select({
        conversationId: imMessages.conversationId,
        cnt: sql<number>`COUNT(*)`.as('cnt'),
      })
        .from(imMessages)
        .where(and(
          sql`${imMessages.conversationId} IN (${sql.join(allConvIds.map(id => sql`${id}`), sql`, `)})`,
          ne(imMessages.senderId, user.userId),
          isNull(imMessages.deletedAt),
          sql`NOT EXISTS (
            SELECT 1 FROM im_read_cursors
            WHERE conversation_id = ${imMessages.conversationId}
            AND user_id = ${user.userId}
            AND updated_at >= ${imMessages.createdAt}
          )`,
        ))
        .groupBy(imMessages.conversationId)
    : []
  const unreadMap = new Map<string, number>()
  for (const u of unreadCounts) unreadMap.set(u.conversationId, u.cnt)

  // 批量查群聊成员数
  const memberCounts = groupIds.length > 0
    ? await db.select({
        conversationId: imMembers.conversationId,
        cnt: sql<number>`COUNT(*)`.as('cnt'),
      })
        .from(imMembers)
        .where(sql`${imMembers.conversationId} IN (${sql.join(groupIds.map((id: any) => sql`${id}`), sql`, `)})`)
        .groupBy(imMembers.conversationId)
    : []
  const memberCntMap = new Map<string, number>()
  for (const m of memberCounts) memberCntMap.set(m.conversationId, m.cnt)

  // 组装结果
  const directItems = directCons.map((c: any) => ({
    id: c.id,
    type: 'direct' as const,
    title: null as string | null,
    memberCount: null as number | null,
    participant: { id: c.participantId, name: c.participantName, avatar: c.participantAvatar },
    lastMessage: c.lastMsgContent ? { content: c.lastMsgContent, senderName: c.lastMsgSenderName || '未知', createdAt: c.lastMsgCreatedAt } : null,
    unreadCount: unreadMap.get(c.id) ?? 0,
  }))

  const groupItems = groupCons.map((c: any) => ({
    id: c.id,
    type: 'group' as const,
    title: c.title,
    memberCount: memberCntMap.get(c.id) ?? 0,
    participant: null,
    lastMessage: groupLastMsgMap.get(c.id) || null,
    unreadCount: unreadMap.get(c.id) ?? 0,
  }))

  const items = [...directItems, ...groupItems]
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || ''
      const bTime = b.lastMessage?.createdAt || ''
      return bTime.localeCompare(aTime)
    })
    .slice(0, pageSize)

  // 获取总数
  const totalRes = await db.select({ total: sql<number>`COUNT(*)`.as('total') })
    .from(imConversations)
    .where(and(
      isNull(imConversations.deletedAt),
      sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imConversations.id} AND user_id = ${user.userId})`,
    ))
  const total = totalRes[0]?.total ?? 0

  return {
    code: 0,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  }
})
