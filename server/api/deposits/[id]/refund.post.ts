import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { db } from '#database'
import { payments, financeTransactions } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少订金 ID' })

  const p = await db.select({
    id: payments.id,
    type: payments.type,
    contractId: payments.contractId,
    customerId: payments.customerId,
    remainingAmount: payments.remainingAmount,
    refundedAt: payments.refundedAt,
  }).from(payments).where(and(eq(payments.id, id), isNull(payments.deletedAt))).limit(1)
  if (!p[0]) throw createError({ statusCode: 404, statusMessage: '订金记录不存在' })
  if (p[0].type !== 'deposit') throw createError({ statusCode: 422, statusMessage: '这不是订金' })

  const remaining = Number(p[0].remainingAmount || 0)

  const body = await readBody(event)
  const refundAmount = body.amount
  if (!refundAmount || refundAmount <= 0) throw createError({ statusCode: 422, statusMessage: '退款金额不对哦' })
  if (refundAmount > remaining) throw createError({ statusCode: 422, statusMessage: `退款金额不能超过剩余 ${(remaining / 100).toFixed(2)} 元` })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const newRemaining = remaining - refundAmount
  const isFullyRefunded = newRemaining <= 0

  // 生成退款流水
  const txId = generateId()
  await db.insert(financeTransactions).values({
    id: txId,
    type: 'expense',
    amount: refundAmount,
    category: 'deposit_refund',
    sourceType: 'deposit_refund',
    sourceId: id,
    contractId: p[0].contractId,
    transactionDate: body.refundDate || now.slice(0, 10),
    description: `订金退款${body.reason ? ' - ' + body.reason : ''}`,
    createdBy: user.userId,
    createdAt: now,
  })

  await db.update(payments).set({
    remainingAmount: newRemaining,
    refundedAt: isFullyRefunded ? now : null,
    refundTransactionId: txId,
  }).where(eq(payments.id, id))

  return { code: 0, data: null, message: '退款已处理' }
})
