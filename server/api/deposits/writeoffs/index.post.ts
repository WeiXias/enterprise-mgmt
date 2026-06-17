import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { depositWriteOffs, payments, contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  if (!body.depositPaymentId) throw createError({ statusCode: 422, statusMessage: '缺少订金 ID' })
  if (!body.contractId) throw createError({ statusCode: 422, statusMessage: '请选择要核销的合同' })
  if (!body.amount || body.amount <= 0) throw createError({ statusCode: 422, statusMessage: '核销金额不对哦' })

  // 验证订金
  const deposit = await db.select({
    id: payments.id,
    type: payments.type,
    remainingAmount: payments.remainingAmount,
  }).from(payments).where(and(eq(payments.id, body.depositPaymentId), isNull(payments.deletedAt))).limit(1)
  if (!deposit[0]) throw createError({ statusCode: 404, statusMessage: '订金记录不存在' })
  if (deposit[0].type !== 'deposit') throw createError({ statusCode: 422, statusMessage: '这不是订金' })
  if (Number(deposit[0].remainingAmount || 0) < body.amount) {
    throw createError({ statusCode: 422, statusMessage: `核销金额不能超过剩余 ${(Number(deposit[0].remainingAmount) / 100).toFixed(2)} 元` })
  }

  // 验证合同
  const ct = await db.select({ id: contracts.id }).from(contracts)
    .where(and(eq(contracts.id, body.contractId), isNull(contracts.deletedAt))).limit(1)
  if (!ct[0]) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const id = generateId()
  await db.insert(depositWriteOffs).values({
    id,
    depositPaymentId: body.depositPaymentId,
    contractId: body.contractId,
    amount: body.amount,
    remark: body.remark || null,
    status: 'pending',
    appliedBy: user.userId,
  })

  return { code: 0, data: { id }, message: '核销申请已提交' }
})
