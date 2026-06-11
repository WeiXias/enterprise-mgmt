import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq, aliasedTable } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '任务不存在' })

  const task = existing[0]

  // Self-join: 用 leftJoin 查出父任务
  const parentTasks = aliasedTable(tasks, 'parent_tasks')
  const withParent = await db
    .select({
      parentId: parentTasks.id,
      parentName: parentTasks.name,
      parentStatus: parentTasks.status,
    })
    .from(tasks)
    .leftJoin(parentTasks, eq(tasks.parentId, parentTasks.id))
    .where(eq(tasks.id, id))
    .limit(1)

  const parentTask =
    withParent[0]?.parentId
      ? {
          id: withParent[0].parentId,
          name: withParent[0].parentName,
          status: withParent[0].parentStatus,
        }
      : null

  // 子任务：parentId = 当前任务 id
  const childTasks = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      status: tasks.status,
      priority: tasks.priority,
      progress: tasks.progress,
      assigneeId: tasks.assigneeId,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
      sortOrder: tasks.sortOrder,
    })
    .from(tasks)
    .where(eq(tasks.parentId, id))

  return {
    code: 0,
    data: {
      ...task,
      parentTask,
      childTasks,
    },
  }
})
