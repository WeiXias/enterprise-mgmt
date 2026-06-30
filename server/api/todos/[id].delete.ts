import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: todos.id }).from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.userId), isNull(todos.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '待办不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(todos).set({ deletedAt: now, updatedAt: now }).where(eq(todos.id, id))
  await logOperation(event, { action: 'DELETE', module: 'todo', targetId: id, detail: '删除了待办' })
  return { code: 0, data: null, message: '待办已删除' }
})