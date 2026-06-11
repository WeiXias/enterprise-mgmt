import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { comments } from '#schema'
import { users } from '#schema/users'
import { notifications } from '#schema/users'
import { eq, and, isNull, like } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  content: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 查找未删除的评论
  const existing = await db.select({
    id: comments.id,
    userId: comments.userId,
    content: comments.content,
    targetType: comments.targetType,
    targetId: comments.targetId,
    mentions: comments.mentions,
  })
    .from(comments)
    .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
    .limit(1)

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '评论不存在' })

  const comment = existing[0]

  // 校验所有权：只能编辑自己的评论
  if (comment.userId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: '只能编辑自己的评论' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 重新解析 @mention
  const mentionRegex = /@(\S+)/g
  const mentionMatches = parsed.data.content.match(mentionRegex)
  const mentionUserIds: string[] = []

  if (mentionMatches && mentionMatches.length > 0) {
    const mentionNames = mentionMatches.map((m: string) => m.slice(1))
    const foundUsers = await db.select({ id: users.id, name: users.name })
      .from(users)
      .where(and(
        ...mentionNames.map(name => like(users.name, `%${name}%`))
      ))
    const exactMatches = foundUsers.filter(u => mentionNames.some(n => u.name === n))
    for (const u of exactMatches) {
      mentionUserIds.push(u.id)
    }
  }

  // 解析旧的 mention 列表
  let oldMentionIds: string[] = []
  if (comment.mentions) {
    try { oldMentionIds = JSON.parse(comment.mentions) } catch { /* ignore */ }
  }

  // 更新评论
  await db.update(comments).set({
    content: parsed.data.content,
    mentions: mentionUserIds.length > 0 ? JSON.stringify(mentionUserIds) : null,
    updatedAt: now,
  }).where(eq(comments.id, id))

  // 给新被 @ 的用户发送通知（排除已 @ 过的）
  const newMentions = mentionUserIds.filter(uid => !oldMentionIds.includes(uid))
  if (newMentions.length > 0) {
    const commenterResult = await db.select({ name: users.name }).from(users).where(eq(users.id, user.userId)).limit(1)
    const commenterName = commenterResult[0]?.name || '有人'

    await db.insert(notifications).values(
      newMentions.map(uid => ({
        id: generateId(),
        userId: uid,
        title: '有人在评论中提到了你',
        content: `${commenterName} 在评论中提到了你（已编辑）`,
        type: 'system' as const,
        isRead: false,
        relatedId: id,
        relatedType: 'comment',
        createdAt: now,
      }))
    )
  }

  await logOperation(event, {
    action: 'UPDATE',
    module: 'comment',
    targetId: id,
    detail: '编辑了评论',
  })

  return { code: 0, data: null, message: '已保存' }
})
