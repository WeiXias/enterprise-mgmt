import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, imMessages, users, notifications } from '#schema'
import { z } from 'zod'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  content: z.string().min(1, '消息不能为空').max(5000),
  replyTo: z.string().optional(),
})

function parseMentions(content: string): string[] {
  const mentionRegex = /@(\S+)/g
  const names = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = mentionRegex.exec(content)) !== null) names.add(match[1]!)
  return [...names]
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)

  // 验证用户是成员
  const member = await db.select({ id: imMembers.id, userId: imMembers.userId })
    .from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (member.length === 0) {
    throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })
  }

  // 验证会话存在
  const conv = await db.select({ id: imConversations.id })
    .from(imConversations)
    .where(and(eq(imConversations.id, convId), isNull(imConversations.deletedAt)))
    .limit(1)
  if (conv.length === 0) throw createError({ statusCode: 404, statusMessage: '会话不存在' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const content = parsed.data.content.trim()

  // 解析 @mention — 仅通知会话内的成员
  const mentionedNames = parseMentions(content)
  let mentionUserIds: string[] = []
  if (mentionedNames.length > 0) {
    const convMembers = await db.select({ userId: imMembers.userId, name: users.name })
      .from(imMembers)
      .innerJoin(users, eq(imMembers.userId, users.id))
      .where(eq(imMembers.conversationId, convId))
    mentionUserIds = convMembers
      .filter(m => m.userId !== user.userId && mentionedNames.some(n => m.name === n))
      .map(m => m.userId)
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const msgId = generateId()

  const result = await db.insert(imMessages).values({
    id: msgId,
    conversationId: convId,
    senderId: user.userId,
    content,
    replyTo: parsed.data.replyTo || null,
    mentions: mentionUserIds.length > 0 ? JSON.stringify(mentionUserIds) : null,
    createdAt: now,
    updatedAt: now,
  }).returning()

  // 更新会话时间
  await db.update(imConversations).set({ updatedAt: now }).where(eq(imConversations.id, convId))

  // 通知 @mention 用户（复用现有通知系统）
  if (mentionUserIds.length > 0) {
    try {
      const authorName = await db.select({ name: users.name })
        .from(users).where(eq(users.id, user.userId)).limit(1)
      const sender = authorName[0]?.name || '有人'
      await db.insert(notifications).values(
        mentionUserIds.map(uid => ({
          id: generateId(),
          userId: uid,
          title: '有人在聊天中@了你',
          content: `${sender}：${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
          type: 'remind' as const,
          isRead: false,
          relatedId: convId,
          relatedType: 'im_conversation',
          createdAt: now,
        })),
      )
    } catch { /* 通知失败不影响主流程 */ }
  }

  await logOperation(event, {
    action: 'CREATE',
    module: 'im',
    targetId: msgId,
    detail: `发送了一条消息`,
  })

  return {
    code: 0,
    data: {
      id: msgId,
      conversationId: convId,
      senderId: user.userId,
      content,
      mentions: mentionUserIds.length > 0 ? mentionUserIds : null,
      createdAt: now,
    },
    message: '发送成功',
  }
})
