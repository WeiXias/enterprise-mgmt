import { db } from '#database'
import { contracts, opportunityProducts, contractProducts } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export async function createContractFromOpportunity(oppId: string, oppName: string, customerId: string, customerName: string, estimatedAmount: number, createdBy: string) {
  const contractId = generateId()
  const code = `HT-${Date.now().toString().slice(-8)}`

  await db.insert(contracts).values({
    id: contractId,
    code,
    name: oppName + ' 合同',
    customerId,
    opportunityId: oppId,
    partyA: customerName,
    partyB: '',
    totalAmount: estimatedAmount || 0,
    status: 'draft',
    createdBy,
  })

  const oppProducts = await db.select().from(opportunityProducts)
    .where(eq(opportunityProducts.opportunityId, oppId))
  if (oppProducts.length > 0) {
    await db.insert(contractProducts).values(
      oppProducts.map((p: any) => ({
        id: generateId(),
        contractId,
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        discount: p.discount,
      }))
    )
  }

  return { contractId, code }
}
