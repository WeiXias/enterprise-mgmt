import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { inventoryTransactions } from '#schema'
import { eq, desc, sql, isNull, and } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'product:read')
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, parseInt(q.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')))

  const where = and(eq(inventoryTransactions.productId, id), isNull(inventoryTransactions.deletedAt))

  const [list, totalResult] = await Promise.all([
    db.select().from(inventoryTransactions).where(where).orderBy(desc(inventoryTransactions.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(inventoryTransactions).where(where),
  ])

  return { code: 0, data: { items: list, total: totalResult[0]?.count ?? 0 } }
})
