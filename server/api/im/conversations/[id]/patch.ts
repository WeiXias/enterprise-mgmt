import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers } from '#schema'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const schema = z.object({ title: z.string().min(1).max(50) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const member = await db.select({ role: imMembers.role }).from(imMembers)
    .where(and(eq(imMembers.conversationId, id), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (member.length === 0) throw createError({ statusCode: 403, statusMessage: '你不在此会话中' })
  if (member[0].role !== 'owner') throw createError({ statusCode: 403, statusMessage: '只有群主能修改群名' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  await db.update(imConversations).set({ title: parsed.data.title }).where(eq(imConversations.id, id))
  return { code: 0, data: { title: parsed.data.title }, message: '群名已更新' }
})
