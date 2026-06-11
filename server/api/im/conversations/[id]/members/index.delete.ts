import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers } from '#schema'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const schema = z.object({ userId: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  const { userId } = parsed.data

  // 群主权限
  const myRole = await db.select({ role: imMembers.role }).from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId))).limit(1)
  if (myRole.length === 0 || myRole[0].role !== 'owner') throw createError({ statusCode: 403, statusMessage: '仅群主能移除成员' })

  if (userId === user.userId) throw createError({ statusCode: 400, statusMessage: '群主不能移除自己，请先转让或解散' })

  // 移除
  const result = await db.delete(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, userId)))
    .returning()

  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '该用户不在群内' })

  return { code: 0, data: null, message: '已移出群聊' }
})
