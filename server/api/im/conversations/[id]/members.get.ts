import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { imMembers, users } from '#schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const membership = await db.select({ id: imMembers.id })
    .from(imMembers)
    .where(and(eq(imMembers.conversationId, id), eq(imMembers.userId, user.userId)))
    .limit(1)
  if (membership.length === 0) {
    throw createError({ statusCode: 403, statusMessage: '无权查看此会话' })
  }

  const members = await db.select({
    id: imMembers.id,
    userId: users.id,
    name: users.name,
    avatar: users.avatar,
    role: users.role,
  })
    .from(imMembers)
    .innerJoin(users, eq(imMembers.userId, users.id))
    .where(eq(imMembers.conversationId, id))

  return { code: 0, data: members }
})
