import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { warehouses } from '#schema'
import { isNull, asc, and, like, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'warehouse:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined

  const where: any[] = [isNull(warehouses.deletedAt)]
  if (keyword) where.push(like(warehouses.name, `%${keyword}%`))

  const [list, totalResult] = await Promise.all([
    db.select().from(warehouses).where(and(...where)).limit(pageSize).offset((page - 1) * pageSize).orderBy(asc(warehouses.name)),
    db.select({ count: sql<number>`count(*)` }).from(warehouses).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
