import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, subcontracts, subcontractParties, users } from '#schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = []
  if (query.status) where.push(eq(subcontracts.status, query.status as string))
  if (query.subcontractPartyId) where.push(eq(subcontracts.subcontractPartyId, query.subcontractPartyId as string))
  if (query.parentContractId) where.push(eq(subcontracts.parentContractId, query.parentContractId as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: subcontracts.id,
      code: subcontracts.code,
      name: subcontracts.name,
      totalAmount: subcontracts.totalAmount,
      taxRate: subcontracts.taxRate,
      serviceFee: subcontracts.serviceFee,
      status: subcontracts.status,
      startDate: subcontracts.startDate,
      endDate: subcontracts.endDate,
      subcontractPartyId: subcontracts.subcontractPartyId,
      subcontractPartyName: subcontractParties.name,
      parentContractId: subcontracts.parentContractId,
      parentContractName: sql<string>`(select name from ${contracts} where ${contracts}.id = ${subcontracts.parentContractId})`,
      createdAt: subcontracts.createdAt,
    }).from(subcontracts)
      .leftJoin(subcontractParties, eq(subcontracts.subcontractPartyId, subcontractParties.id))
      .where(and(...where))
      .orderBy(desc(subcontracts.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(subcontracts).where(and(...where)),
  ])

  return {
    code: 0,
    data: {
      items: list,
      total: Number(totalResult[0]?.count || 0),
      page,
      pageSize,
      totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / pageSize),
    },
  }
})
