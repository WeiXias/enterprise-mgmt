import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { contracts, payments, paymentPlans } from '#schema'
import { and, isNull, sql, eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // role filter
  const ownerWhere = user.role === 'sales_member' ? eq(contracts.ownerUserId, user.userId) : undefined

  // 总览统计
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)

  const totalRow = await db.select({
    totalCount: sql<number>`count(*)`,
    totalAmount: sql<number>`coalesce(sum(${contracts.totalAmount}), 0)`,
    inProgressCount: sql<number>`sum(case when ${contracts.status} not in ('completed','terminated','draft') then 1 else 0 end)`,
    draftCount: sql<number>`sum(case when ${contracts.status} = 'draft' then 1 else 0 end)`,
    completedCount: sql<number>`sum(case when ${contracts.status} = 'completed' then 1 else 0 end)`,
    newThisMonth: sql<number>`sum(case when ${contracts.createdAt} >= ${monthStart} then 1 else 0 end)`,
    expiringSoon: sql<number>`sum(case when ${contracts.status} not in ('completed','terminated') and ${contracts.endDate} is not null and ${contracts.endDate} >= ${today} and ${contracts.endDate} <= ${thirtyDaysLater} then 1 else 0 end)`,
  }).from(contracts).where(and(isNull(contracts.deletedAt), ownerWhere) as any)

  const t = totalRow[0]

  // 收款统计
  const paymentRow = await db.select({
    totalReceived: sql<number>`coalesce(sum(${payments.amount}), 0)`,
  }).from(payments)
    .innerJoin(contracts, eq(payments.contractId, contracts.id))
    .where(and(isNull(contracts.deletedAt), ownerWhere))

  const totalAmount = Number(t?.totalAmount || 0)
  const totalReceived = Number(paymentRow[0]?.totalReceived || 0)

  return {
    code: 0,
    data: {
      total: Number(t?.totalCount || 0),
      totalAmount,
      totalReceived,
      totalUnreceived: totalAmount - totalReceived,
      inProgressCount: Number(t?.inProgressCount || 0),
      draftCount: Number(t?.draftCount || 0),
      completedCount: Number(t?.completedCount || 0),
      newThisMonth: Number(t?.newThisMonth || 0),
      expiringSoon: Number(t?.expiringSoon || 0),
    }
  }
})
