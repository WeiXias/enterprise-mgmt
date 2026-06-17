import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const supplierId = query.supplierId as string | undefined

  const where: any[] = [isNull(purchaseOrders.deletedAt)]
  if (supplierId) where.push(eq(purchaseOrders.supplierId, supplierId))

  const [list, totalResult] = await Promise.all([
    db.select().from(purchaseOrders)
      .where(and(...where))
      .limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(purchaseOrders.createdAt)),
    db.select({ count: count() }).from(purchaseOrders).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
