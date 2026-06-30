import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { todos, todoSubtasks, todoTagRelations, todoTags } from '#schema/todos'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  const result = await db.select().from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.userId), isNull(todos.deletedAt)))
    .limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '待办不存在' })

  const todo = result[0]

  // 获取子任务
  const subtasks = await db.select().from(todoSubtasks)
    .where(and(eq(todoSubtasks.todoId, id), isNull(todoSubtasks.deletedAt)))
    .orderBy(todoSubtasks.sortOrder)

  // 获取标签
  const tagRels = await db.select().from(todoTagRelations)
    .where(eq(todoTagRelations.todoId, id))
  const tagIds = tagRels.map((r: any) => r.tagId)
  const tags = tagIds.length > 0
    ? await db.select().from(todoTags).where(inArray(todoTags.id, tagIds))
    : []

  return {
    code: 0,
    data: {
      ...todo,
      subtasks,
      tags,
    },
  }
})