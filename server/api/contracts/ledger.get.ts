import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { contracts, customers, payments, paymentPlans } from '#schema'
import { eq, like, and, isNull, count, desc, sum, lte, inArray, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const where: any[] = [isNull(contracts.deletedAt)]
  if (query.keyword) where.push(like(contracts.name, `%${query.keyword}%`))
  if (query.status) where.push(eq(contracts.status, query.status as string))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: contracts.id, code: contracts.code, name: contracts.name,
      customerName: customers.name,
      totalAmount: contracts.totalAmount,
      status: contracts.status,
    }).from(contracts).leftJoin(customers, eq(contracts.customerId, customers.id))
      .where(and(...where)).limit(pageSize).offset((page - 1) * pageSize).orderBy(desc(contracts.updatedAt)),
    db.select({ count: count() }).from(contracts).where(and(...where)),
  ])

  if (list.length === 0) {
    const total = Number(totalResult[0]?.count || 0)
    return { code: 0, data: { items: [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
  }

  const contractIds = list.map(c => c.id)

  // 按合同聚合已收金额
  const paymentAgg = await db.select({
    contractId: payments.contractId,
    totalReceived: sum(payments.amount),
    latestDate: sql<string>`max(${payments.paymentDate})`,
  }).from(payments)
    .where(inArray(payments.contractId, contractIds))
    .groupBy(payments.contractId)

  const paidMap = new Map(paymentAgg.map(p => [p.contractId, p as typeof paymentAgg[number]]))

  // 查找每个合同最近的待付款计划（含逾期）
  const today = new Date().toISOString().slice(0, 10)
  const plans = await db.select({
    contractId: paymentPlans.contractId,
    amount: paymentPlans.amount,
    planDate: paymentPlans.planDate,
  }).from(paymentPlans)
    .where(and(
      inArray(paymentPlans.contractId, contractIds),
      eq(paymentPlans.status, 'pending'),
    ))
    .orderBy(paymentPlans.planDate)

  const nextPlanMap = new Map<string, { amount: number; planDate: string }>()
  for (const p of plans) {
    if (!nextPlanMap.has(p.contractId)) nextPlanMap.set(p.contractId, { amount: Number(p.amount), planDate: p.planDate })
  }

  const items = list.map(c => {
    const totalAmt = Number(c.totalAmount) // 已经是分
    const paid = paidMap.get(c.id)
    const receivedAmount = paid?.totalReceived ? Number(paid.totalReceived) : 0
    const nextPlan = nextPlanMap.get(c.id)
    return {
      id: c.id, code: c.code, name: c.name,
      customer: { name: c.customerName },
      totalAmount: totalAmt,
      receivedAmount,
      unreceivedAmount: totalAmt - receivedAmount,
      paymentProgress: totalAmt > 0 ? Math.round((receivedAmount / totalAmt) * 10000) / 100 : 0,
      nextPaymentDate: nextPlan?.planDate || null,
      nextPaymentAmount: nextPlan?.amount || null,
      status: c.status,
    }
  })

  const total = Number(totalResult[0]?.count || 0)
  return { code: 0, data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) } }
})
