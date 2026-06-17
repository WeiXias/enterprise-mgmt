import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '#database'
import { depositWriteOffs, payments, paymentPlans, financeTransactions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少核销 ID' })

  // 获取核销申请
  const wo = await db.select().from(depositWriteOffs)
    .where(and(eq(depositWriteOffs.id, id), isNull(depositWriteOffs.deletedAt))).limit(1)
  if (!wo[0]) throw createError({ statusCode: 404, statusMessage: '核销申请不存在' })
  if (wo[0].status !== 'pending') throw createError({ statusCode: 422, statusMessage: '只能审批待处理的申请' })

  // 验证订金
  const deposit = await db.select({
    id: payments.id,
    remainingAmount: payments.remainingAmount,
  }).from(payments).where(and(eq(payments.id, wo[0].depositPaymentId), isNull(payments.deletedAt))).limit(1)
  if (!deposit[0]) throw createError({ statusCode: 404, statusMessage: '订金已不存在' })

  const remaining = Number(deposit[0].remainingAmount || 0)
  const writeOffAmount = Number(wo[0].amount)
  if (writeOffAmount > remaining) {
    throw createError({ statusCode: 422, statusMessage: '订金余额不足，可能已被其他核销使用' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 更新核销申请
  await db.update(depositWriteOffs).set({
    status: 'approved',
    approvedBy: user.userId,
    approvedAt: now,
  }).where(eq(depositWriteOffs.id, id))

  // 扣减订金剩余
  const newRemaining = remaining - writeOffAmount
  await db.update(payments).set({
    remainingAmount: newRemaining,
  }).where(eq(payments.id, wo[0].depositPaymentId))

  // 在合同下创建一笔正式回款
  const paymentId = generateId()
  await db.insert(payments).values({
    id: paymentId,
    contractId: wo[0].contractId,
    type: 'normal',
    amount: writeOffAmount,
    paymentDate: now.slice(0, 10),
    paymentMethod: 'bank_transfer',
    remark: `订金核销（订金#${wo[0].depositPaymentId.slice(0, 8)}）`,
    createdBy: user.userId,
    createdAt: now,
  })

  // 查找合同下 pending 的收款计划并标记
  const plans = await db.select({ id: paymentPlans.id }).from(paymentPlans)
    .where(and(
      eq(paymentPlans.contractId, wo[0].contractId),
      eq(paymentPlans.status, 'pending'),
      isNull(paymentPlans.deletedAt),
    )).limit(1)
  if (plans[0]) {
    await db.update(paymentPlans).set({ status: 'paid' }).where(eq(paymentPlans.id, plans[0].id))
  }

  // 生成财务收入流水
  await db.insert(financeTransactions).values({
    id: generateId(),
    type: 'income',
    amount: writeOffAmount,
    category: 'deposit_writeoff',
    sourceType: 'deposit_writeoff',
    sourceId: id,
    contractId: wo[0].contractId,
    transactionDate: now.slice(0, 10),
    description: `订金转回款（订金#${wo[0].depositPaymentId.slice(0, 8)}）`,
    createdBy: user.userId,
    createdAt: now,
  })

  return { code: 0, data: null, message: '核销已通过' }
})
