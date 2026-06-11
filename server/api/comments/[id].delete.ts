import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { comments } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  // 查找未删除的评论
  const existing = await db.select({
    id: comments.id,
    userId: comments.userId,
  })
    .from(comments)
    .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
    .limit(1)

  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '评论不存在' })

  // 校验所有权：只能删除自己的评论
  if (existing[0].userId !== user.id && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '只能删除自己的评论' })
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(comments).set({ deletedAt: now }).where(eq(comments.id, id))

  await logOperation(event, {
    action: 'DELETE',
    module: 'comment',
    targetId: id,
    detail: '删除了评论',
  })

  return { code: 0, data: null, message: '已删除' }
})
