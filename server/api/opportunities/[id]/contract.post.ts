import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { createContractFromOpportunity } from '#server-utils/contract-from-opportunity'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: oppId } = getRouterParams(event)

  const opp = await db.select({
    id: opportunities.id,
    name: opportunities.name,
    customerId: opportunities.customerId,
    estimatedAmount: opportunities.estimatedAmount,
  }).from(opportunities).where(and(eq(opportunities.id, oppId), isNull(opportunities.deletedAt))).limit(1)
  if (opp.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })

  const o = opp[0]
  const { contractId } = await createContractFromOpportunity(
    oppId, o.name, o.customerId, o.estimatedAmount || 0, user.userId,
  )

  await logOperation(event, { action: 'CREATE', module: 'contract', targetId: contractId, detail: '商机转合同' })
  return { code: 0, data: { id: contractId }, message: '合同草稿已生成' }
})
