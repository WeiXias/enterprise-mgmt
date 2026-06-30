import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { opportunities, customers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { createContractFromOpportunity } from '#server-utils/contract-from-opportunity'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  generateContract: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body || {})
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({
    id: opportunities.id,
    status: opportunities.status,
    customerId: opportunities.customerId,
    name: opportunities.name,
    estimatedAmount: opportunities.estimatedAmount,
  }).from(opportunities)
    .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })
  if (existing[0].status === 'closed_won' || existing[0].status === 'closed_lost') {
    throw createError({ statusCode: 400, statusMessage: '已经决单了，不能重复操作' })
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.update(opportunities).set({ status: 'closed_won', updatedAt: now }).where(eq(opportunities.id, id))
  await logOperation(event, { action: 'APPROVE', module: 'opportunity', targetId: id, detail: '商机赢单' })

  await db.update(customers).set({ status: 'closed', updatedAt: now }).where(eq(customers.id, existing[0].customerId))

  let contractId: string | undefined
  if (parsed.data.generateContract) {
    const [cust] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, existing[0].customerId)).limit(1)
    const customerName = cust?.name || '未知客户'
    const result = await createContractFromOpportunity(
      id, existing[0].name, existing[0].customerId, customerName, existing[0].estimatedAmount || 0, user.userId,
    )
    contractId = result.contractId
  }

  return { code: 0, data: { contractId }, message: '恭喜，赢单了！' + (contractId ? '合同草稿已生成' : '') }
})
