import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { comments, tasks, users, notifications } from '#schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(2000),
  parentId: z.string().optional().nullable(),
})

function parseMentions(content: string): string[] {
  const mentionRegex = /@(\S+)/g
  const mentionedNames = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = mentionRegex.exec(content)) !== null) {
    mentionedNames.add(match[1]!)
  }
  return [...mentionedNames]
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: taskId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })
  }

  const { content, parentId } = parsed.data

  // 检查任务是否存在
  const task = await db.select({ id: tasks.id, name: tasks.name }).from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1)
  if (task.length === 0) throw createError({ statusCode: 404, statusMessage: '任务不存在' })

  // 如果是回复，检查父评论是否存在
  if (parentId) {
    const parent = await db.select({ id: comments.id }).from(comments)
      .where(and(eq(comments.id, parentId), eq(comments.targetType, 'task'), isNull(comments.deletedAt)))
      .limit(1)
    if (parent.length === 0) throw createError({ statusCode: 404, statusMessage: '父评论不存在' })
  }

  // 解析@提及
  const mentionedNames = parseMentions(content)
  let mentionUserIds: string[] = []
  if (mentionedNames.length > 0) {
    const resolved = await db.select({ id: users.id }).from(users)
      .where(inArray(users.name, mentionedNames))
    mentionUserIds = resolved.map(u => u.id)
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const commentId = generateId()

  const result = await db.insert(comments).values({
    id: commentId,
    targetType: 'task',
    targetId: taskId,
    userId: user.userId,
    content,
    parentId: parentId || null,
    mentions: mentionUserIds.length > 0 ? JSON.stringify(mentionUserIds) : null,
    createdAt: now,
    updatedAt: now,
  }).returning()

  // 通知被@提及的用户
  if (mentionUserIds.length > 0) {
    try {
      const authorName = user.name || '有人'
      await db.insert(notifications).values(
        mentionUserIds.map(uid => ({
          id: generateId(),
          userId: uid,
          title: '有人在评论中@了你',
          content: `${authorName} 在任务「${task[0].name}」的评论中提到了你`,
          type: 'remind' as const,
          isRead: false,
          relatedId: taskId,
          relatedType: 'task',
          createdAt: now,
        }))
      )
    } catch { /* 通知发送失败不影响主流程 */ }
  }

  await logOperation(event, {
    action: 'CREATE',
    module: 'task',
    targetId: commentId,
    detail: `对任务「${task[0].name}」发表了评论`,
  })

  return { code: 0, data: result[0], message: '评论已发布' }
})
