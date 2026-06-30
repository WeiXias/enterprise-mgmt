import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { timeLogs, tasks, users } from '#schema'
import { eq, and, isNull, asc, desc, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'time-log:view')
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 200)
  const sortBy = (query.sortBy as string) || 'date'
  const sortOrder = (query.sortOrder as string) || 'desc'
  const sortFn = sortOrder === 'asc' ? asc : desc

  const where: any[] = [eq(timeLogs.projectId, projectId), isNull(timeLogs.deletedAt)]
  if (query.userId) where.push(eq(timeLogs.userId, query.userId as string))
  if (query.taskId) where.push(eq(timeLogs.taskId, query.taskId as string))
  if (query.status) where.push(eq(timeLogs.status, query.status as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: timeLogs.id, date: timeLogs.date, hours: timeLogs.hours,
      description: timeLogs.description, status: timeLogs.status,
      taskId: timeLogs.taskId, taskName: tasks.name,
      userId: timeLogs.userId, userName: users.name,
      createdAt: timeLogs.createdAt,
    }).from(timeLogs)
      .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
      .leftJoin(users, eq(timeLogs.userId, users.id))
      .where(and(...where))
      .limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(sortFn(timeLogs[sortBy as keyof typeof timeLogs] || timeLogs.date)),
    db.select({ count: count() }).from(timeLogs).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
