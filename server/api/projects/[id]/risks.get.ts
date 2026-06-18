import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { risks } from '#schema'
import { eq, and, isNull, asc, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 50, 200)
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'
  const sortFn = sortOrder === 'asc' ? asc : desc

  const where: any[] = [eq(risks.projectId, projectId), isNull(risks.deletedAt)]
  if (query.type) where.push(eq(risks.type, query.type as string))
  if (query.status) where.push(eq(risks.status, query.status as string))

  const [list, totalResult] = await Promise.all([
    db.select().from(risks).where(and(...where))
      .limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(sortFn(risks[sortBy as keyof typeof risks] || risks.createdAt)),
    db.select({ count: count() }).from(risks).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
