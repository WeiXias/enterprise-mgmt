import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '#database'
import { reconciliations, reconciliationItems, payments, customers, contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'reconciliation:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少对账单 ID' })

  const r = await db.select({
    id: reconciliations.id,
    code: reconciliations.code,
    customerId: reconciliations.customerId,
    customerName: customers.name,
    contractId: reconciliations.contractId,
    periodStart: reconciliations.periodStart,
    periodEnd: reconciliations.periodEnd,
    openingAmount: reconciliations.openingAmount,
    contractAmount: reconciliations.contractAmount,
    receivedAmount: reconciliations.receivedAmount,
    closingAmount: reconciliations.closingAmount,
    status: reconciliations.status,
    remark: reconciliations.remark,
    createdBy: reconciliations.createdBy,
    confirmedBy: reconciliations.confirmedBy,
    confirmedAt: reconciliations.confirmedAt,
    createdAt: reconciliations.createdAt,
  }).from(reconciliations)
    .leftJoin(customers, eq(reconciliations.customerId, customers.id))
    .where(and(eq(reconciliations.id, id), isNull(reconciliations.deletedAt)))
    .limit(1)

  if (!r[0]) throw createError({ statusCode: 404, statusMessage: '对账单不存在' })

  // 获取对账项（关联回款记录）
  const items = await db.select({
    id: reconciliationItems.id,
    paymentId: reconciliationItems.paymentId,
    matchedAmount: reconciliationItems.matchedAmount,
    paymentDate: payments.paymentDate,
    paymentMethod: payments.paymentMethod,
    paymentAmount: payments.amount,
    remark: payments.remark,
  }).from(reconciliationItems)
    .leftJoin(payments, eq(reconciliationItems.paymentId, payments.id))
    .where(eq(reconciliationItems.reconciliationId, id))

  return {
    code: 0,
    data: {
      ...r[0],
      openingAmount: Number(r[0].openingAmount),
      contractAmount: Number(r[0].contractAmount),
      receivedAmount: Number(r[0].receivedAmount),
      closingAmount: Number(r[0].closingAmount),
      items: items.map(i => ({
        ...i,
        matchedAmount: Number(i.matchedAmount),
        paymentAmount: Number(i.paymentAmount),
      })),
    },
  }
})
