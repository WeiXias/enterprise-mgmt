import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { opportunities, contracts, opportunityProducts, contractProducts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: oppId } = getRouterParams(event)

  const opp = await db.select({
    id: opportunities.id,
    name: opportunities.name,
    customerId: opportunities.customerId,
    estimatedAmount: opportunities.estimatedAmount,
    status: opportunities.status,
  }).from(opportunities).where(and(eq(opportunities.id, oppId), isNull(opportunities.deletedAt))).limit(1)
  if (opp.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })

  const o = opp[0]
  const contractId = generateId()
  const code = `HT-${Date.now().toString().slice(-8)}`
  await db.insert(contracts).values({
    id: contractId,
    code,
    name: o!.name + ' 合同',
    customerId: o!.customerId,
    opportunityId: oppId,
    partyA: o!.name,
    partyB: '',
    totalAmount: o!.estimatedAmount || 0,
    status: 'draft',
    createdBy: user.userId,
  })

  // 自动带入商机产品明细
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

  await logOperation(event, { action: 'CREATE', module: 'contract', targetId: contractId, detail: `商机转合同` })
  return { code: 0, data: { id: contractId }, message: '合同草稿已生成' }
})
