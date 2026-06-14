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

  // 1. 查用户参与的所有会话（不分类型）
  const allCons = await db.select({
    id: imConversations.id,
    type: imConversations.type,
    title: imConversations.title,
    createdAt: imConversations.createdAt,
    updatedAt: imConversations.updatedAt,
  })
    .from(imConversations)
    .where(and(
      isNull(imConversations.deletedAt),
      sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imConversations.id} AND user_id = ${user.userId})`,
    ))

  const directIds: string[] = []
  const groupIds: string[] = []
  for (const c of allCons) {
    if (c.type === 'direct') directIds.push(c.id)
    else groupIds.push(c.id)
  }
  const allConvIds = [...directIds, ...groupIds]

  // 2. 查私聊的对方信息
  const participantMap = new Map<string, { id: string; name: string; avatar: string | null }>()
  if (directIds.length > 0) {
    const participants = await db.select({
      conversationId: imMembers.conversationId,
      userId: users.id,
      name: users.name,
      avatar: users.avatar,
    })
      .from(imMembers)
      .innerJoin(users, eq(imMembers.userId, users.id))
      .where(and(
        sql`${imMembers.conversationId} IN (${sql.join(directIds.map(id => sql`${id}`), sql`, `)})`,
        ne(imMembers.userId, user.userId),
      ))
    for (const p of participants) {
      participantMap.set(p.conversationId, { id: p.userId, name: p.name, avatar: p.avatar })
    }
  }

  // 3. 查最后消息（所有会话）
  const lastMsgMap = new Map<string, { content: string; senderName: string | null; createdAt: string }>()
  if (allConvIds.length > 0) {
    const lastMsgs = await db.all<{ conversationId: string; content: string; senderName: string | null; createdAt: string }>(sql`
      SELECT conversation_id, content, sender_name, created_at FROM (
        SELECT
          m.conversation_id,
          m.content,
          u.name AS sender_name,
          m.created_at,
          ROW_NUMBER() OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC) AS rn
        FROM im_messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id IN (${sql.join(allConvIds.map(id => sql`${id}`), sql`, `)})
          AND m.deleted_at IS NULL
      ) WHERE rn = 1
    `)
    for (const m of lastMsgs) {
      lastMsgMap.set(m.conversationId, { content: m.content, senderName: m.senderName, createdAt: m.createdAt })
    }
  }

  // 4. 查未读数
  const unreadMap = new Map<string, number>()
  if (allConvIds.length > 0) {
    const unreads = await db.all<{ conversationId: string; cnt: number }>(sql`
      SELECT m.conversation_id, COUNT(*) AS cnt
      FROM im_messages m
      WHERE m.conversation_id IN (${sql.join(allConvIds.map(id => sql`${id}`), sql`, `)})
        AND m.sender_id != ${user.userId}
        AND m.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM im_read_cursors rc
          WHERE rc.conversation_id = m.conversation_id
          AND rc.user_id = ${user.userId}
          AND rc.updated_at >= m.created_at
        )
      GROUP BY m.conversation_id
    `)
    for (const u of unreads) {
      unreadMap.set(u.conversationId, u.cnt)
    }
  }

  // 5. 查群聊成员数
  const memberCntMap = new Map<string, number>()
  if (groupIds.length > 0) {
    const cnts = await db.all<{ conversationId: string; cnt: number }>(sql`
      SELECT conversation_id, COUNT(*) AS cnt
      FROM im_members
      WHERE conversation_id IN (${sql.join(groupIds.map(id => sql`${id}`), sql`, `)})
      GROUP BY conversation_id
    `)
    for (const m of cnts) memberCntMap.set(m.conversationId, m.cnt)
  }

  // 6. 组装结果
  const items: any[] = []
  for (const c of allCons) {
    if (c.type === 'direct') {
      const p = participantMap.get(c.id)
      items.push({
        id: c.id,
        type: 'direct' as const,
        title: null,
        memberCount: null,
        participant: p || null,
        lastMessage: lastMsgMap.get(c.id) || null,
        unreadCount: unreadMap.get(c.id) ?? 0,
      })
    } else {
      items.push({
        id: c.id,
        type: 'group' as const,
        title: c.title,
        memberCount: memberCntMap.get(c.id) ?? 0,
        participant: null,
        lastMessage: lastMsgMap.get(c.id) || null,
        unreadCount: unreadMap.get(c.id) ?? 0,
      })
    }
  }

  items.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.createdAt || ''
    const bTime = b.lastMessage?.createdAt || b.createdAt || ''
    return bTime.localeCompare(aTime)
  })

  return {
    code: 0,
    data: {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    },
  }
})
