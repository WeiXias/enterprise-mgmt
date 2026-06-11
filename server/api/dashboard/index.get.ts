import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { customers, opportunities, contracts, payments } from '#schema'
import { followUps } from '#schema/customers'
import { tasks } from '#schema/projects'
import { eq, and, isNull, sql, gte, lte, isNotNull, ne, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'
  const thirtyDaysLater = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)

  const [customerCount, oppCount, contractThisMonth, receivedThisMonth, followUpCount, taskCount, expiringCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(customers).where(isNull(customers.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(opportunities).where(and(isNull(opportunities.deletedAt), ne(opportunities.status, 'closed_won'), ne(opportunities.status, 'closed_lost'))),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(contracts).where(and(isNull(contracts.deletedAt), gte(contracts.createdAt, monthStart))),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments).where(gte(payments.paymentDate, monthStart)),
    db.select({ count: sql<number>`count(*)` }).from(followUps).where(lte(followUps.nextFollowUpAt, today)),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.status, 'todo'), isNotNull(tasks.endDate))),
    db.select({ count: sql<number>`count(*)` }).from(contracts).where(and(isNull(contracts.deletedAt), isNotNull(contracts.endDate), gte(contracts.endDate, today), lte(contracts.endDate, thirtyDaysLater))),
  ])

  const [recentCustomers, recentOpps, funnelRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, status: customers.status, createdAt: customers.createdAt }).from(customers).where(isNull(customers.deletedAt)).orderBy(desc(customers.createdAt)).limit(5),
    db.select({
      id: opportunities.id,
      name: opportunities.name,
      customerName: customers.name,
      amount: opportunities.estimatedAmount,
      status: opportunities.status,
    }).from(opportunities).leftJoin(customers, eq(opportunities.customerId, customers.id))
      .where(and(isNull(opportunities.deletedAt), ne(opportunities.status, 'closed_won'), ne(opportunities.status, 'closed_lost')))
      .orderBy(desc(opportunities.createdAt)).limit(5),
    db.select({
      status: opportunities.status,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(estimated_amount), 0)`,
    }).from(opportunities).where(isNull(opportunities.deletedAt)).groupBy(opportunities.status),
  ])

  const funnelTotal = funnelRows.reduce((sum, r) => sum + Number(r.count), 0)

  return {
    code: 0,
    data: {
      kpi: {
        customerTotal: Number(customerCount[0]?.count || 0),
        opportunityInProgress: Number(oppCount[0]?.count || 0),
        contractAmountThisMonth: Number(contractThisMonth[0]?.total || 0),
        receivedAmountThisMonth: Number(receivedThisMonth[0]?.total || 0),
      },
      todayReminders: {
        followUps: Number(followUpCount[0]?.count || 0),
        expiringContracts: Number(expiringCount[0]?.count || 0),
        dueTasks: Number(taskCount[0]?.count || 0),
      },
      recentCustomers,
      recentOpportunities: recentOpps,
      funnelData: { stages: funnelRows, total: funnelTotal },
    }
  }
})
