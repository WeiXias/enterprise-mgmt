import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers } from '#schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)

  const conv = await db.select({ id: imConversations.id, type: imConversations.type }).from(imConversations)
    .where(eq(imConversations.id, convId)).limit(1)
  if (conv.length === 0) throw createError({ statusCode: 404, statusMessage: '会话不存在' })
  if (conv[0].type !== 'group') throw createError({ statusCode: 400, statusMessage: '仅群聊支持此操作' })

  const member = await db.select({ role: imMembers.role, id: imMembers.id }).from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId))).limit(1)
  if (member.length === 0) throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })

  if (member[0].role === 'owner') {
    // 群主退出=解散（所有成员都移除）
    await db.delete(imMembers).where(eq(imMembers.conversationId, convId))
    await db.update(imConversations).set({ deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }).where(eq(imConversations.id, convId))
    return { code: 0, data: null, message: '群聊已解散' }
  }

  await db.delete(imMembers).where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId)))
  return { code: 0, data: null, message: '已退出群聊' }
})
