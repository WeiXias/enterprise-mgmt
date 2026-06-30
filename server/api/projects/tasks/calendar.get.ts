import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { tasks, projects, users } from '#schema'
import { eq, and, isNull, like } from 'drizzle-orm'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const month = query.month as string

  // 校验 month 参数
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw createError({ statusCode: 400, statusMessage: '参数 month 格式错误，应为 YYYY-MM' })
  }

  const monthPrefix = month + '-'

  const where: any[] = [isNull(tasks.deletedAt), like(tasks.endDate, `${monthPrefix}%`)]

  if (query.projectId) {
    where.push(eq(tasks.projectId, query.projectId as string))
  }
  if (query.assigneeId) {
    where.push(eq(tasks.assigneeId, query.assigneeId as string))
  }

  const rows = await db.select({
    id: tasks.id,
    name: tasks.name,
    projectId: tasks.projectId,
    projectName: projects.name,
    assigneeId: tasks.assigneeId,
    assigneeName: users.name,
    priority: tasks.priority,
    status: tasks.status,
    endDate: tasks.endDate,
  }).from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...where))

  // 按 endDate 分组
  const grouped: Record<string, any[]> = {}
  for (const row of rows) {
    const date = row.endDate
    if (!date) continue
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push({
      id: row.id,
      title: row.name,
      projectName: row.projectName,
      priority: row.priority,
      status: row.status,
      assigneeName: row.assigneeName,
    })
  }

  return { code: 0, data: grouped }
})
