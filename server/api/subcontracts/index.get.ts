import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, subcontractParties, users } from '#schema'
import { eq, and, count, desc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [eq(contracts.contractType, 'subcontract')]
  if (query.status) where.push(eq(contracts.status, query.status as string))
  if (query.subcontractPartyId) where.push(eq(contracts.subcontractPartyId, query.subcontractPartyId as string))
  if (query.parentContractId) where.push(eq(contracts.parentContractId, query.parentContractId as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: contracts.id,
      code: contracts.code,
      name: contracts.name,
      totalAmount: contracts.totalAmount,
      taxRate: contracts.taxRate,
      serviceFee: contracts.serviceFee,
      status: contracts.status,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      subcontractPartyId: contracts.subcontractPartyId,
      subcontractPartyName: subcontractParties.name,
      parentContractId: contracts.parentContractId,
      parentContractName: sql<string>`(select name from ${contracts} pc where pc.id = ${contracts.parentContractId})`,
      createdAt: contracts.createdAt,
    }).from(contracts)
      .leftJoin(subcontractParties, eq(contracts.subcontractPartyId, subcontractParties.id))
      .where(and(...where))
      .orderBy(desc(contracts.createdAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: count() }).from(contracts).where(and(...where)),
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
