import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imMessages, imAttachments, users } from '#schema'
import { eq, and, isNull, or, like, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const keyword = String(query.keyword || '').trim()
  if (!keyword) throw createError({ statusCode: 422, statusMessage: '请输入搜索关键词' })

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const conversationId = query.conversationId ? String(query.conversationId) : null

  const conditions = [isNull(imMessages.deletedAt), isNull(imConversations.deletedAt)]
  const kw = `%${keyword}%`

  // 搜索范围：消息内容 + 文件名 + 发送人
  conditions.push(or(
    like(imMessages.content, kw),
    like(imAttachments.fileName, kw),
    like(users.name, kw),
  ))

  // 限定用户可见的会话
  conditions.push(sql`EXISTS (SELECT 1 FROM im_members WHERE conversation_id = ${imMessages.conversationId} AND user_id = ${user.userId})`)

  if (conversationId) {
    conditions.push(eq(imMessages.conversationId, conversationId))
  }

  const totalRes = await db.select({ total: sql<number>`COUNT(DISTINCT ${imMessages.id})`.as('total') })
    .from(imMessages)
    .innerJoin(imConversations, eq(imMessages.conversationId, imConversations.id))
    .leftJoin(imAttachments, eq(imAttachments.messageId, imMessages.id))
    .leftJoin(users, eq(imMessages.senderId, users.id))
    .where(and(...conditions))
  const total = totalRes[0]?.total ?? 0

  const rows = await db.select({
    id: imMessages.id,
    conversationId: imMessages.conversationId,
    conversationType: imConversations.type,
    conversationTitle: imConversations.title,
    sender: { id: users.id, name: users.name, avatar: users.avatar },
    type: imMessages.type,
    content: imMessages.content,
    createdAt: imMessages.createdAt,
  })
    .from(imMessages)
    .innerJoin(imConversations, eq(imMessages.conversationId, imConversations.id))
    .leftJoin(imAttachments, eq(imAttachments.messageId, imMessages.id))
    .leftJoin(users, eq(imMessages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(imMessages.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // 为每条消息取附件
  const items = await Promise.all(rows.map(async (m: any) => {
    const atts = await db.select({
      id: imAttachments.id, fileName: imAttachments.fileName, fileSize: imAttachments.fileSize,
      fileType: imAttachments.fileType, filePath: imAttachments.filePath,
    }).from(imAttachments).where(eq(imAttachments.messageId, m.id))

    return {
      ...m,
      attachments: atts,
    }
  }))

  return { code: 0, data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
