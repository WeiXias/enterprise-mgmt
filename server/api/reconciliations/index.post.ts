import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { reconciliations, reconciliationItems, payments, contracts } from '#schema'
import { and, isNull, gte, lte, sum, eq, sql } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'reconciliation:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const customerId = body.customerId
  const contractId = body.contractId || null
  const periodStart = body.periodStart
  const periodEnd = body.periodEnd

  if (!customerId || !periodStart || !periodEnd) {
    throw createError({ statusCode: 422, statusMessage: '客户、对账期间都要填哦' })
  }

  // 期初应收：期间开始前该客户的合同总额 - 已回款金额
  const openingWhere: any[] = [isNull(contracts.deletedAt)]
  if (contractId) {
    openingWhere.push(eq(contracts.id, contractId))
  } else {
    openingWhere.push(eq(contracts.customerId, customerId))
  }
  openingWhere.push(sql`${contracts.createdAt} < ${periodStart}`)

  const openingContracts = await db.select({
    totalAmount: sum(contracts.totalAmount),
  }).from(contracts).where(and(...openingWhere))
  const openingContractTotal = Number(openingContracts[0]?.totalAmount || 0)

  // 期间开始前回款
  const openingPaymentsWhere: any[] = [
    isNull(payments.deletedAt),
    eq(payments.type, 'normal'),
  ]
  if (contractId) {
    openingPaymentsWhere.push(eq(payments.contractId, contractId))
  } else {
    openingPaymentsWhere.push(eq(payments.customerId, customerId))
  }
  openingPaymentsWhere.push(sql`${payments.paymentDate} < ${periodStart}`)

  const openingPayments = await db.select({
    totalAmount: sum(payments.amount),
  }).from(payments).where(and(...openingPaymentsWhere))
  const openingPaymentTotal = Number(openingPayments[0]?.totalAmount || 0)

  // 期间内新增合同金额
  const periodContractWhere: any[] = [isNull(contracts.deletedAt)]
  if (contractId) {
    periodContractWhere.push(eq(contracts.id, contractId))
  } else {
    periodContractWhere.push(eq(contracts.customerId, customerId))
  }
  periodContractWhere.push(gte(contracts.createdAt, periodStart))
  periodContractWhere.push(lte(contracts.createdAt, periodEnd))

  const periodContracts = await db.select({
    totalAmount: sum(contracts.totalAmount),
  }).from(contracts).where(and(...periodContractWhere))
  const periodContractTotal = Number(periodContracts[0]?.totalAmount || 0)

  // 期间内回款
  const periodPaymentsWhere: any[] = [
    isNull(payments.deletedAt),
    eq(payments.type, 'normal'),
  ]
  if (contractId) {
    periodPaymentsWhere.push(eq(payments.contractId, contractId))
  } else {
    periodPaymentsWhere.push(eq(payments.customerId, customerId))
  }
  periodPaymentsWhere.push(gte(payments.paymentDate, periodStart))
  periodPaymentsWhere.push(lte(payments.paymentDate, periodEnd))

  const periodPayments = await db.select({
    totalAmount: sum(payments.amount),
  }).from(payments).where(and(...periodPaymentsWhere))
  const periodPaymentTotal = Number(periodPayments[0]?.totalAmount || 0)

  // 期末 = 期初 + 本期新增 - 本期回款
  const openingAmount = openingContractTotal - openingPaymentTotal
  const closingAmount = openingAmount + periodContractTotal - periodPaymentTotal

  // 生成对账单编号
  const code = 'RC-' + dayjs().format('YYYYMMDD') + '-' + generateId().slice(0, 6).toUpperCase()

  const id = generateId()

  // 插入对账单
  await db.insert(reconciliations).values({
    id,
    code,
    customerId,
    contractId,
    periodStart,
    periodEnd,
    openingAmount,
    contractAmount: periodContractTotal,
    receivedAmount: periodPaymentTotal,
    closingAmount,
    status: 'pending',
    remark: body.remark || '',
    createdBy: user.userId,
  })

  // 关联期间内的回款记录
  const periodPaymentRecords = await db.select({
    id: payments.id,
    amount: payments.amount,
  }).from(payments).where(and(...periodPaymentsWhere))

  if (periodPaymentRecords.length > 0) {
    await db.insert(reconciliationItems).values(
      periodPaymentRecords.map(p => ({
        id: generateId(),
        reconciliationId: id,
        paymentId: p.id,
        matchedAmount: p.amount,
      }))
    )
  }

  return { code: 0, data: { id }, message: '对账单已创建' }
})
