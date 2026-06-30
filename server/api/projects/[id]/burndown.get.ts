import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { projects, tasks } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'project:read')
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const query = getQuery(event)

  // Fetch project
  const projList = await db.select().from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1)
  if (projList.length === 0) throw createError({ statusCode: 404, statusMessage: '项目不存在' })

  const project = projList[0]

  // Determine date range from query or project defaults
  const rawStart = (query.startDate as string) || project!.startDate
  const rawEnd   = (query.endDate   as string) || project!.endDate
  if (!rawStart || !rawEnd) {
    throw createError({ statusCode: 400, statusMessage: '缺少开始或结束日期，请设置项目日期或传入查询参数' })
  }

  const rangeStart = parseDate(rawStart)
  const rangeEnd   = parseDate(rawEnd)

  // Get all non-deleted tasks for this project
  const taskList = await db.select({
    status: tasks.status,
    createdAt: tasks.createdAt,
  }).from(tasks)
    .where(and(eq(tasks.projectId, id), isNull(tasks.deletedAt)))

  // Generate day array
  const days: string[] = []
  const cursor = new Date(rangeStart)
  while (cursor <= rangeEnd) {
    days.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  if (days.length === 0) {
    return { code: 0, data: { days: [], actual: [], ideal: [] } }
  }

  const totalTasks = taskList.length
  const ideal: number[] = []
  const actual: number[] = []

  for (let i = 0; i < days.length; i++) {
    const dayStr = days[i]
    const dayDateTime = parseDate(dayStr)
    // Add 1 day so createdAt <= 23:59:59 of the given day
    const nextDay = new Date(dayDateTime)
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayStr = formatDate(nextDay)

    // Count tasks: status != 'completed' AND createdAt < nextDay
    const remaining = taskList.filter((t: any) => {
      return t.status !== 'completed' && t.createdAt < nextDayStr
    }).length

    actual.push(remaining)

    // Ideal line: linear from total at day 0 to 0 at last day
    if (days.length === 1) {
      ideal.push(0)
    } else {
      ideal.push(Math.round((totalTasks - totalTasks * i / (days.length - 1)) * 10) / 10)
    }
  }

  return { code: 0, data: { days, actual, ideal } }
})
