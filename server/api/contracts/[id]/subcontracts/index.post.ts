import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts, contractProducts } from '#schema'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: parentId } = getRouterParams(event)
  const body = await readBody(event)
  const { name, totalAmount, subcontractPartyId, taxRate, serviceFee, items } = body || {}

  if (!name || !totalAmount) throw createError({ statusCode: 422, statusMessage: '分包名称和金额还没填呢' })

  const parent = await db.select({ id: contracts.id, code: contracts.code, taxRate: contracts.taxRate, customerId: contracts.customerId, partyA: contracts.partyA })
    .from(contracts).where(and(eq(contracts.id, parentId), isNull(contracts.deletedAt))).limit(1)
  if (!parent.length) throw createError({ statusCode: 404, statusMessage: '主合同不存在' })

  const rate = taxRate ?? parent[0].taxRate ?? 0.05
  const finalAmount = totalAmount * (1 + rate)

  const code = `HT-${Date.now()}`
  const subId = generateId()
  await db.insert(contracts).values({
    id: subId, code, name,
    customerId: parent[0].customerId,
    partyA: parent[0].partyA || '', partyB: body.partyB || '',
    parentContractId: parentId, contractType: 'subcontract',
    subcontractPartyId: subcontractPartyId || null,
    totalAmount: finalAmount, taxRate: rate,
    serviceFee: serviceFee || 0,
    status: 'draft', createdBy: user.userId,
  })

  // 关联产品明细
  if (items && items.length > 0) {
    await db.insert(contractProducts).values(items.map((p: { productId: string; quantity: number; unitPrice: number; discount: number }) => ({
      id: generateId(),
      contractId: subId,
      productId: p.productId,
      quantity: p.quantity || 1,
      unitPrice: p.unitPrice || 0,
      discount: (p.discount || 100) / 100,
    })))
  }

  await logOperation(event, { action: 'CREATE', module: 'subcontract', targetId: subId, detail: '创建了分包合同' })

  return { code: 0, data: { id: subId, totalAmount: finalAmount, taxRate: rate }, message: '分包合同已创建' }
})
