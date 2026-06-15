import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts, contractProducts, paymentPlans } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const existing = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, id)).limit(1)
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: '分包合同不存在' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(contractProducts).set({ deletedAt: now } as any).where(eq(contractProducts.contractId, id))
  await db.update(paymentPlans).set({ deletedAt: now } as any).where(eq(paymentPlans.contractId, id))
  await db.update(contracts).set({ deletedAt: now }).where(eq(contracts.id, id))

  await logOperation(event, { action: 'DELETE', module: 'subcontract', targetId: id, detail: '删除了分包合同' })

  return { code: 0, data: null, message: '分包合同已删除' }
})
