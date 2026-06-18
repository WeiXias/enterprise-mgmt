import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { desc, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    name: subcontractParties.name, createdAt: subcontractParties.createdAt,
  }
  const orderColumn = sortColumns[sortBy] || subcontractParties.createdAt

  const list = await db.select().from(subcontractParties)
    .orderBy(orderFn(orderColumn))
    .limit(pageSize).offset((page - 1) * pageSize)

  return { code: 0, data: list }
})
