import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { inventoryTransactions } from '#schema'
import { eq, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, parseInt(q.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize || '20')))

  const where = eq(inventoryTransactions.productId, id)

  const [list, totalResult] = await Promise.all([
    db.select().from(inventoryTransactions).where(where).orderBy(desc(inventoryTransactions.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(inventoryTransactions).where(where),
  ])

  return { code: 0, data: { items: list, total: totalResult[0]?.count ?? 0 } }
})
