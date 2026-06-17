import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '#database'
import { contracts, paymentPlans, payments, customers } from '#schema'
import { eq, and, isNull, sum } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const customerId = getRouterParam(event, 'customerId')
  if (!customerId) throw createError({ statusCode: 422, statusMessage: '缺少客户 ID' })

  // 客户信息
  const customer = await db.select({ id: customers.id, name: customers.name })
    .from(customers).where(eq(customers.id, customerId)).limit(1)
  if (!customer[0]) throw createError({ statusCode: 404, statusMessage: '客户不存在' })

  // 该客户所有有效合同
  const contractList = await db.select({
    id: contracts.id,
    code: contracts.code,
    name: contracts.name,
    totalAmount: contracts.totalAmount,
    status: contracts.status,
  }).from(contracts)
    .where(and(eq(contracts.customerId, customerId), isNull(contracts.deletedAt)))

  // 聚合每个合同的回款
  const contractIds = contractList.map(c => c.id)
  const paymentAgg = contractIds.length > 0
    ? await db.select({
        contractId: payments.contractId,
        totalReceived: sum(payments.amount),
      }).from(payments)
        .where(and(isNull(payments.deletedAt), eq(payments.type, 'normal')))
        .groupBy(payments.contractId)
    : []

  const paymentMap = new Map<string, number>()
  for (const p of paymentAgg) {
    if (p.contractId) paymentMap.set(p.contractId, Number(p.totalReceived || 0))
  }

  let totalContractAmount = 0
  let totalReceived = 0
  const details = contractList.map(c => {
    const received = paymentMap.get(c.id) || 0
    totalContractAmount += Number(c.totalAmount)
    totalReceived += received
    return {
      contractId: c.id,
      contractCode: c.code,
      contractName: c.name,
      contractStatus: c.status,
      contractAmount: Number(c.totalAmount),
      receivedAmount: received,
      balance: Number(c.totalAmount) - received,
    }
  })

  return {
    code: 0,
    data: {
      customerId: customer[0].id,
      customerName: customer[0].name,
      totalContractAmount,
      totalReceived,
      totalBalance: totalContractAmount - totalReceived,
      contracts: details,
    },
  }
})
