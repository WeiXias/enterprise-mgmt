import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { tasks, users } from '#schema'
import { eq, and, isNull, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'task:read')
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 100, 500)

  const where = and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: tasks.id, title: tasks.name, description: tasks.description,
      assigneeId: tasks.assigneeId, assigneeName: users.name,
      priority: tasks.priority, status: tasks.status,
      startDate: tasks.startDate, dueDate: tasks.endDate,
      completedAt: tasks.completedAt, sortOrder: tasks.sortOrder,
      createdAt: tasks.createdAt,
    }).from(tasks).leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(where).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(tasks.sortOrder),
    db.select({ count: count() }).from(tasks).where(where),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
