import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, users } from '#schema'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

const schema = z.object({ userId: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: convId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  const { userId } = parsed.data

  // 验证群聊 + 群主
  const conv = await db.select({ id: imConversations.id, type: imConversations.type }).from(imConversations)
    .where(eq(imConversations.id, convId)).limit(1)
  if (conv.length === 0) throw createError({ statusCode: 404, statusMessage: '会话不存在' })
  if (conv[0].type !== 'group') throw createError({ statusCode: 400, statusMessage: '仅群聊支持此操作' })

  const myRole = await db.select({ role: imMembers.role }).from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, user.userId))).limit(1)
  if (myRole.length === 0 || myRole[0].role !== 'owner') throw createError({ statusCode: 403, statusMessage: '仅群主能添加成员' })

  // 验证 userId 存在
  const u = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId)).limit(1)
  if (u.length === 0) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  // 查是否已在群内
  const existing = await db.select({ id: imMembers.id }).from(imMembers)
    .where(and(eq(imMembers.conversationId, convId), eq(imMembers.userId, userId))).limit(1)
  if (existing.length > 0) throw createError({ statusCode: 409, statusMessage: '该用户已在群内' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.insert(imMembers).values({
    id: generateId(), conversationId: convId, userId, role: 'member', joinedAt: now,
  })

  return { code: 0, data: u[0], message: `${u[0].name} 已加入群聊` }
})
