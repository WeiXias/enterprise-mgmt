import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { projects, contracts, users } from '#schema'
import { eq, like, and, isNull, count, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const sortBy = (query.sortBy as string) || 'updatedAt'
  const sortOrder = (query.sortOrder as string) || 'desc'
  const sortFn = sortOrder === 'asc' ? asc : desc

  const where: any[] = [isNull(projects.deletedAt)]
  if (query.keyword) where.push(like(projects.name, `%${query.keyword}%`))
  if (query.status) where.push(eq(projects.status, query.status as string))
  if (query.contractId) where.push(eq(projects.contractId, query.contractId as string))

  // 销售成员和财务只看自己的项目
  if (user.role === 'sales_member' || user.role === 'finance') {
    where.push(eq(projects.ownerUserId, user.userId))
  }

  const [list, totalResult] = await Promise.all([
    db.select({
      id: projects.id, name: projects.name, status: projects.status,
      startDate: projects.startDate, endDate: projects.endDate,
      budget: projects.budget, remark: projects.remark,
      ownerUserId: projects.ownerUserId, ownerName: users.name,
      contractId: projects.contractId, contractCode: contracts.code, contractName: contracts.name,
      createdAt: projects.createdAt,
    }).from(projects)
      .leftJoin(users, eq(projects.ownerUserId, users.id))
      .leftJoin(contracts, eq(projects.contractId, contracts.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(sortFn(projects[sortBy as keyof typeof projects] || projects.updatedAt)),
    db.select({ count: count() }).from(projects).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        budget: p.budget,
        startDate: p.startDate,
        endDate: p.endDate,
        owner: { id: p.ownerUserId, name: p.ownerName },
        contract: p.contractId ? { id: p.contractId, code: p.contractCode, name: p.contractName } : null,
        createdAt: p.createdAt,
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
})
