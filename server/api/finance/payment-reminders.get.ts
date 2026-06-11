import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { paymentPlans, contracts } from '#schema'
import { eq, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const today = new Date().toISOString().slice(0, 10)
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const [overdue, upcoming] = await Promise.all([
    db.select({
      id: paymentPlans.id,
      amount: paymentPlans.amount,
      planDate: paymentPlans.planDate,
      contractId: paymentPlans.contractId,
      contractName: contracts.name,
      contractCode: contracts.code,
      status: paymentPlans.status,
    }).from(paymentPlans)
      .leftJoin(contracts, eq(paymentPlans.contractId, contracts.id))
      .where(and(eq(paymentPlans.status, 'pending'), sql`plan_date < ${today}`)),
    db.select({
      id: paymentPlans.id,
      amount: paymentPlans.amount,
      planDate: paymentPlans.planDate,
      contractId: paymentPlans.contractId,
      contractName: contracts.name,
      contractCode: contracts.code,
      status: paymentPlans.status,
    }).from(paymentPlans)
      .leftJoin(contracts, eq(paymentPlans.contractId, contracts.id))
      .where(and(eq(paymentPlans.status, 'pending'), sql`plan_date >= ${today}`, sql`plan_date <= ${nextWeek}`)),
  ])

  return {
    code: 0,
    data: {
      overdue: overdue.map(p => ({
        ...p,
        overdueDays: Math.max(0, Math.floor((Date.now() - new Date(p.planDate).getTime()) / 86400000)),
      })),
      upcoming,
    }
  }
})
