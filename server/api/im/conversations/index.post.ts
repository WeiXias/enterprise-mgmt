import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { imConversations, imMembers, users } from '#schema'
import { z } from 'zod'
import { eq, and, isNull, inArray, sql } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  participantId: z.string().optional(),
  title: z.string().min(1).max(50).optional(),
  memberIds: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const data = parsed.data
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const convId = generateId()

  // ===== 群聊 =====
  if (data.type === 'group') {
    if (!data.title) throw createError({ statusCode: 422, statusMessage: '群聊名称没填' })
    if (!data.memberIds || data.memberIds.length < 2) {
      throw createError({ statusCode: 422, statusMessage: '至少需要2位成员' })
    }
    // 去重 + 排除自己
    const memberIds = [...new Set(data.memberIds.filter(id => id !== user.userId))]
    if (memberIds.length === 0) {
      throw createError({ statusCode: 422, statusMessage: '至少需要1位其他成员' })
    }
    // 验证所有用户存在
    const found = await db.select({ id: users.id, name: users.name }).from(users)
      .where(inArray(users.id, memberIds))
    if (found.length !== memberIds.length) throw createError({ statusCode: 404, statusMessage: '部分用户不存在' })

    await db.insert(imConversations).values({
      id: convId, type: 'group', title: data.title, createdBy: user.userId, createdAt: now, updatedAt: now,
    })
    const memberRows = [
      { id: generateId(), conversationId: convId, userId: user.userId, role: 'owner' as const, joinedAt: now },
      ...memberIds.map(uid => ({ id: generateId(), conversationId: convId, userId: uid, role: 'member' as const, joinedAt: now })),
    ]
    await db.insert(imMembers).values(memberRows)

    await logOperation(event, { action: 'CREATE', module: 'im', targetId: convId, detail: `创建了群聊「${data.title}」` })

    return {
      code: 0,
      data: { id: convId, type: 'group', title: data.title, memberCount: memberRows.length },
      message: '群聊已创建',
    }
  }

  // ===== 私聊 =====
  const { participantId } = data
  if (!participantId) throw createError({ statusCode: 422, statusMessage: '请选择聊天对象' })
  if (participantId === user.userId) {
    throw createError({ statusCode: 400, statusMessage: '不能和自己聊天' })
  }

  const participant = await db.select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users).where(eq(users.id, participantId)).limit(1)
  if (participant.length === 0) throw createError({ statusCode: 404, statusMessage: '该用户不存在' })

  const existing = await db.select({ conversationId: imMembers.conversationId })
    .from(imMembers)
    .innerJoin(imConversations, and(
      eq(imMembers.conversationId, imConversations.id),
      eq(imConversations.type, 'direct'),
      isNull(imConversations.deletedAt),
    ))
    .where(inArray(imMembers.userId, [user.userId, participantId]))
    .groupBy(imMembers.conversationId)
    .having(sql`COUNT(DISTINCT ${imMembers.userId}) = 2`)

  if (existing.length > 0) {
    const cid = existing[0].conversationId
    await logOperation(event, { action: 'CREATE', module: 'im', targetId: cid, detail: `与「${participant[0].name}」发起了聊天（已有会话）` })
    return { code: 0, data: { id: cid, type: 'direct', participant: participant[0] }, message: '已有聊天记录' }
  }

  await db.insert(imConversations).values({ id: convId, type: 'direct', createdAt: now, updatedAt: now })
  await db.insert(imMembers).values([
    { id: generateId(), conversationId: convId, userId: user.userId, joinedAt: now },
    { id: generateId(), conversationId: convId, userId: participantId, joinedAt: now },
  ])

  await logOperation(event, { action: 'CREATE', module: 'im', targetId: convId, detail: `与「${participant[0].name}」开始新聊天` })
  return { code: 0, data: { id: convId, type: 'direct', participant: participant[0] }, message: '开始聊天' }
})
