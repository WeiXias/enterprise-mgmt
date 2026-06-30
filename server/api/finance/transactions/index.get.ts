import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { financeTransactions, contracts, users } from '#schema'
import { eq, like, and, isNull, count, desc, gte, lte } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'finance:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(financeTransactions.deletedAt)]
  if (query.keyword) where.push(like(financeTransactions.description, `%${query.keyword}%`))
  if (query.type) where.push(eq(financeTransactions.type, query.type as string))
  if (query.category) where.push(eq(financeTransactions.category, query.category as string))
  if (query.startDate) where.push(gte(financeTransactions.transactionDate, query.startDate as string))
  if (query.endDate) where.push(lte(financeTransactions.transactionDate, query.endDate as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: financeTransactions.id,
      type: financeTransactions.type,
      amount: financeTransactions.amount,
      category: financeTransactions.category,
      sourceType: financeTransactions.sourceType,
      sourceId: financeTransactions.sourceId,
      contractId: financeTransactions.contractId,
      contractCode: contracts.code,
      contractName: contracts.name,
      projectId: financeTransactions.projectId,
      transactionDate: financeTransactions.transactionDate,
      description: financeTransactions.description,
      paymentMethod: financeTransactions.paymentMethod,
      createdBy: financeTransactions.createdBy,
      creatorName: users.name,
      createdAt: financeTransactions.createdAt,
    }).from(financeTransactions)
      .leftJoin(contracts, eq(financeTransactions.contractId, contracts.id))
      .leftJoin(users, eq(financeTransactions.createdBy, users.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize)
      .orderBy(desc(financeTransactions.transactionDate), desc(financeTransactions.createdAt)),
    db.select({ count: count() }).from(financeTransactions).where(and(...where)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: { items: list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }
})
