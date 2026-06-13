import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { todoLists, todos } from '#schema/todos'
import { eq, and, isNull, count, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // 只返回当前用户的清单，按 sortOrder 排序
  const lists = await db.select().from(todoLists)
    .where(and(eq(todoLists.userId, user.userId), isNull(todoLists.deletedAt)))
    .orderBy(todoLists.sortOrder)

  // 统计每个清单的任务数量
  const listIds = lists.map((l: any) => l.id)
  const countMap: Record<string, { total: number; completed: number }> = {}

  if (listIds.length > 0) {
    const stats = await db.select({
      listId: todos.listId,
      total: count(),
      completed: count(todos.completedAt),
    }).from(todos)
      .where(and(inArray(todos.listId, listIds), isNull(todos.deletedAt)))
      .groupBy(todos.listId)

    for (const s of stats) {
      countMap[s.listId] = { total: Number(s.total), completed: Number(s.completed) }
    }
  }

  return {
    code: 0,
    data: lists.map((l: any) => ({
      ...l,
      todoCount: countMap[l.id]?.total || 0,
      completedCount: countMap[l.id]?.completed || 0,
    })),
  }
})