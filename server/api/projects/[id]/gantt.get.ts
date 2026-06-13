import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { projects, tasks, users } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)

  // 项目日期范围
  const [project] = await db.select({
    startDate: projects.startDate,
    endDate: projects.endDate,
  }).from(projects).where(eq(projects.id, id)).limit(1)

  // 任务列表
  const taskList = await db.select({
    id: tasks.id,
    name: tasks.name,
    assigneeName: users.name,
    startDate: tasks.startDate,
    endDate: tasks.endDate,
    parentId: tasks.parentId,
    status: tasks.status,
    progress: tasks.progress,
  }).from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(eq(tasks.projectId, id), isNull(tasks.deletedAt)))
    .orderBy(tasks.sortOrder)

  return {
    code: 0,
    data: {
      project: project || { startDate: null, endDate: null },
      tasks: taskList.map((t: any) => ({
        ...t,
        progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? Math.max(t.progress || 0, 50) : (t.progress || 0),
      })),
    }
  }
})
