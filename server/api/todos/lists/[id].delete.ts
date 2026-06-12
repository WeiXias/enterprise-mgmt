import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { todoLists } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: todoLists.id }).from(todoLists)
    .where(and(eq(todoLists.id, id), eq(todoLists.userId, user.userId), isNull(todoLists.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '清单不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(todoLists).set({ deletedAt: now, updatedAt: now }).where(eq(todoLists.id, id))
  await logOperation(event, { action: 'DELETE', module: 'todo_list', targetId: id, detail: '删除了清单' })
  return { code: 0, data: null, message: '清单已删除' }
})