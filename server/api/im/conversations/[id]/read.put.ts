import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { imMembers, imMessages, imReadCursors } from '#schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'

const schema = z.object({
  messageId: z.string().min(1, '消息ID不能为空'),
})

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
    throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }
  const { messageId } = parsed.data

  // 验证消息属于此会话
  const msg = await db.select({ id: imMessages.id })
    .from(imMessages)
    .where(and(eq(imMessages.id, messageId), eq(imMessages.conversationId, convId)))
    .limit(1)
  if (msg.length === 0) throw createError({ statusCode: 404, statusMessage: '消息不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 插入或更新已读游标
  const existing = await db.select({ id: imReadCursors.id })
    .from(imReadCursors)
    .where(and(eq(imReadCursors.conversationId, convId), eq(imReadCursors.userId, user.userId)))
    .limit(1)

  if (existing.length > 0) {
    await db.update(imReadCursors)
      .set({ lastReadMessageId: messageId, updatedAt: now })
      .where(eq(imReadCursors.id, existing[0].id))
  } else {
    await db.insert(imReadCursors).values({
      id: generateId(),
      conversationId: convId,
      userId: user.userId,
      lastReadMessageId: messageId,
      updatedAt: now,
    })
  }

  return { code: 0, data: { lastReadMessageId: messageId }, message: '已标记已读' }
})
