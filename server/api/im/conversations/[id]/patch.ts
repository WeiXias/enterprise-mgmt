import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers } from '#schema'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const schema = z.union([
  z.object({ title: z.string().min(1).max(50) }),
  z.object({ isDeleted: z.literal(true) }),
])

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 验证用户是成员
  const member = await db.select({ role: imMembers.role, id: imMembers.id }).from(imMembers)
    .where(and(eq(imMembers.conversationId, id), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (member.length === 0) throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })

  const data = parsed.data

  if ('isDeleted' in data) {
    // 删除=移除当前用户成员记录（个人隐藏），不会删除会话也不会影响其他成员
    await db.delete(imMembers).where(eq(imMembers.id, member[0].id))
    return { code: 0, data: null, message: '会话已删除' }
  }

  // 修改标题——仅群主
  if (member[0].role !== 'owner') throw createError({ statusCode: 403, statusMessage: '只有群主能修改群名' })
  await db.update(imConversations).set({ title: data.title }).where(eq(imConversations.id, id))
  return { code: 0, data: { title: data.title }, message: '群名已更新' }
})
