import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { contracts, subcontractParties } from '#schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: contractId } = getRouterParams(event)
  const list = await db.select({
    id: contracts.id, code: contracts.code, name: contracts.name,
    totalAmount: contracts.totalAmount, taxRate: contracts.taxRate,
    status: contracts.status,
    subcontractPartyId: contracts.subcontractPartyId,
    subcontractPartyName: subcontractParties.name,
    createdAt: contracts.createdAt,
  }).from(contracts)
    .leftJoin(subcontractParties, eq(contracts.subcontractPartyId, subcontractParties.id))
    .where(and(eq(contracts.parentContractId, contractId), eq(contracts.contractType, 'subcontract')))

  return { code: 0, data: list }
})
