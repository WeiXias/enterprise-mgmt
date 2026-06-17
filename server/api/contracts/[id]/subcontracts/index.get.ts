import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { subcontracts, subcontractParties } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: contractId } = getRouterParams(event)
  const list = await db.select({
    id: subcontracts.id, code: subcontracts.code, name: subcontracts.name,
    totalAmount: subcontracts.totalAmount, taxRate: subcontracts.taxRate,
    status: subcontracts.status,
    subcontractPartyId: subcontracts.subcontractPartyId,
    subcontractPartyName: subcontractParties.name,
    createdAt: subcontracts.createdAt,
  }).from(subcontracts)
    .leftJoin(subcontractParties, eq(subcontracts.subcontractPartyId, subcontractParties.id))
    .where(and(eq(subcontracts.parentContractId, contractId), isNull(subcontracts.deletedAt)))

  return { code: 0, data: list }
})
