import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { tasks, users } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const list = await db.select({
    id: tasks.id, title: tasks.title, description: tasks.description,
    assigneeId: tasks.assigneeId, assigneeName: users.name,
    priority: tasks.priority, status: tasks.status,
    startDate: tasks.startDate, dueDate: tasks.dueDate,
    completedAt: tasks.completedAt, sortOrder: tasks.sortOrder,
    createdAt: tasks.createdAt,
  }).from(tasks).leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))
    .orderBy(tasks.sortOrder)
  return { code: 0, data: list }
})
