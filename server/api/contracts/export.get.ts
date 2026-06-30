import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, customers } from '#schema'
import { and, isNull, count, desc, sql, like, eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const where: any[] = [isNull(contracts.deletedAt)]
  if (query.keyword) where.push(like(contracts.name, `%${query.keyword}%`))
  const [list, totalResult] = await Promise.all([
    db.select({ id: contracts.id, contractNo: contracts.contractNo, name: contracts.name,
      totalAmount: contracts.totalAmount, receivedAmount: contracts.receivedAmount,
      status: contracts.status, customerName: customers.name,
    }).from(contracts).leftJoin(customers, eq(contracts.customerId, customers.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(contracts.updatedAt)),
    db.select({ count: count() }).from(contracts).where(and(...where)),
  ])
  return { code: 0, data: { items: list, total: Number(totalResult[0]?.count || 0), page, pageSize, totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / pageSize) } }
})