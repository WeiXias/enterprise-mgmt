import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { payments, financeTransactions, contracts } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  if (!body.customerId) throw createError({ statusCode: 422, statusMessage: '请选择客户' })
  if (!body.amount || body.amount <= 0) throw createError({ statusCode: 422, statusMessage: '金额还没填呢' })
  if (!body.paymentDate) throw createError({ statusCode: 422, statusMessage: '请选择收款日期' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const paymentId = generateId()

  // 如果关联了合同，验证合同存在
  if (body.contractId) {
    const ct = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.id, body.contractId)).limit(1)
    if (!ct[0]) throw createError({ statusCode: 422, statusMessage: '合同不存在' })
  }

  await db.insert(payments).values({
    id: paymentId,
    contractId: body.contractId || null,
    customerId: body.customerId,
    type: 'deposit',
    amount: body.amount,
    remainingAmount: body.amount,
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod || 'bank_transfer',
    remark: body.remark || null,
    createdBy: user.userId,
    createdAt: now,
  })

  // 生成财务收入流水
  await db.insert(financeTransactions).values({
    id: generateId(),
    type: 'income',
    amount: body.amount,
    category: 'deposit',
    sourceType: 'contract_payment',
    sourceId: paymentId,
    contractId: body.contractId || null,
    transactionDate: body.paymentDate,
    description: `订金${body.remark ? ' - ' + body.remark : ''}`,
    paymentMethod: body.paymentMethod || 'bank_transfer',
    createdBy: user.userId,
    createdAt: now,
  })

  return { code: 0, data: { id: paymentId }, message: '订金已登记' }
})
