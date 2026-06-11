import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts, contractProducts, paymentPlans } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const existing = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包合同不存在' })

  await db.delete(contractProducts).where(eq(contractProducts.contractId, id))
  await db.delete(paymentPlans).where(eq(paymentPlans.contractId, id))
  await db.delete(contracts).where(eq(contracts.id, id))

  await logOperation(event, { action: 'DELETE', module: 'subcontract', targetId: id, detail: '删除了分包合同' })

  return { code: 0, data: null, message: '分包合同已删除' }
})
