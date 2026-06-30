import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { todoSubtasks } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { subtaskId } = getRouterParams(event)
  const existing = await db.select({ id: todoSubtasks.id }).from(todoSubtasks)
    .where(and(eq(todoSubtasks.id, subtaskId), isNull(todoSubtasks.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '子任务不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(todoSubtasks).set({ deletedAt: now, updatedAt: now }).where(eq(todoSubtasks.id, subtaskId))
  return { code: 0, data: null, message: '子任务已删除' }
})