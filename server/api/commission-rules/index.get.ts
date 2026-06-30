import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'
import { asc, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'commission-rule:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    name: commissionRules.name, rate: commissionRules.rate, createdAt: commissionRules.createdAt,
  }
  const orderColumn = sortColumns[sortBy] || commissionRules.createdAt

  const list = await db.select().from(commissionRules).orderBy(orderFn(orderColumn)).limit(pageSize).offset((page - 1) * pageSize)

  return { code: 0, data: list }
})
