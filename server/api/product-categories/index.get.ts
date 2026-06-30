import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, asc, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  await requirePermission(event, 'product-category:read')
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 100, 500)
  const sortBy = (query.sortBy as string) || 'sort'
  const sortOrder = (query.sortOrder as string) || 'asc'

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    sort: dictEntries.sort, name: dictEntries.label, createdAt: dictEntries.createdAt,
  }
  const orderColumn = sortColumns[sortBy] || dictEntries.sort

  const rows = await db.select({
    id: dictEntries.id,
    name: dictEntries.label,
    sort: dictEntries.sort,
    createdAt: dictEntries.createdAt,
  }).from(dictEntries)
    .where(eq(dictEntries.dict_type, 'product_category'))
    .orderBy(orderFn(orderColumn), asc(dictEntries.label))
    .limit(pageSize).offset((page - 1) * pageSize)

  return { code: 0, data: rows.map(r => ({ id: r.id, name: r.name, sort: r.sort, createdAt: r.createdAt })) }
})
