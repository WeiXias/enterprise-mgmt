import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { projects, tasks } from '#schema'
import { eq, and, isNull, sum, count, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const [projectStats, taskStats] = await Promise.all([
    // 项目统计
    db.select({
      totalProjects: count(),
      inProgress: sql<number>`SUM(CASE WHEN ${projects.status} = 'in_progress' THEN 1 ELSE 0 END)`,
      delayed:     sql<number>`SUM(CASE WHEN ${projects.status} = 'delayed' THEN 1 ELSE 0 END)`,
      completed:   sql<number>`SUM(CASE WHEN ${projects.status} = 'completed' THEN 1 ELSE 0 END)`,
      totalBudget: sum(projects.budget),
    }).from(projects).where(isNull(projects.deletedAt)),

    // 任务统计（仅统计未删除项目下的未删除任务）
    db.select({
      taskCount:          count(),
      completedTaskCount: sql<number>`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)`,
    }).from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(isNull(tasks.deletedAt), isNull(projects.deletedAt))),
  ])

  const p = projectStats[0]
  const t = taskStats[0]

  return {
    code: 0,
    data: {
      totalProjects:    Number(p.totalProjects),
      inProgress:       Number(p.inProgress ?? 0),
      delayed:          Number(p.delayed ?? 0),
      completed:        Number(p.completed ?? 0),
      totalBudget:      Number(p.totalBudget ?? 0),
      taskCount:        Number(t.taskCount),
      completedTaskCount: Number(t.completedTaskCount ?? 0),
    },
  }
})
