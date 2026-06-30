import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema'
import { eq, asc, desc, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'deliverable:read')
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 200)
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'
  const sortFn = sortOrder === 'asc' ? asc : desc

  const where = eq(deliverables.projectId, projectId)
  const [list, totalResult] = await Promise.all([
    db.select().from(deliverables)
      .where(where).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(sortFn(deliverables[sortBy as keyof typeof deliverables] || deliverables.createdAt)),
    db.select({ count: count() }).from(deliverables).where(where),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
