import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { milestones } from '#schema'
import { eq, and, isNull, asc, desc, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  await requirePermission(event, 'milestone:view')
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 200)
  const sortBy = (query.sortBy as string) || 'sortOrder'
  const sortOrder = (query.sortOrder as string) || 'asc'
  const sortFn = sortOrder === 'asc' ? asc : desc

  const where = and(eq(milestones.projectId, projectId), isNull(milestones.deletedAt))
  const [list, totalResult] = await Promise.all([
    db.select().from(milestones)
      .where(where).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(sortFn(milestones[sortBy as keyof typeof milestones] || milestones.sortOrder)),
    db.select({ count: count() }).from(milestones).where(where),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
