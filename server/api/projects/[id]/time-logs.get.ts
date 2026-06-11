import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { timeLogs, tasks, users } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)

  const where: any[] = [eq(timeLogs.projectId, projectId), isNull(timeLogs.deletedAt)]
  if (query.userId) where.push(eq(timeLogs.userId, query.userId as string))
  if (query.taskId) where.push(eq(timeLogs.taskId, query.taskId as string))
  if (query.status) where.push(eq(timeLogs.status, query.status as string))

  const list = await db.select({
    id: timeLogs.id, date: timeLogs.date, hours: timeLogs.hours,
    description: timeLogs.description, status: timeLogs.status,
    taskId: timeLogs.taskId, taskName: tasks.name,
    userId: timeLogs.userId, userName: users.name,
    createdAt: timeLogs.createdAt,
  }).from(timeLogs)
    .leftJoin(tasks, eq(timeLogs.taskId, tasks.id))
    .leftJoin(users, eq(timeLogs.userId, users.id))
    .where(and(...where))
    .orderBy(timeLogs.date)

  return { code: 0, data: list }
})
