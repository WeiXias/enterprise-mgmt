import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { customers, opportunities, contracts, payments } from '#schema'
import { invoices } from '#schema/invoices'
import { commissions, commissionPayouts, commissionPayoutItems } from '#schema/commissions'
import { users } from '#schema/users'
import { followUps } from '#schema/customers'
import { tasks } from '#schema/projects'
import { eq, and, isNull, sql, gte, lte, isNotNull, ne, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // 构建角色隔离条件
  const isSalesMember = user.role === 'sales_member'
  const isFinance = user.role === 'finance'

  // 销售成员只能看自己负责的数据
  const ownerWhere = isSalesMember ? eq(opportunities.ownerUserId, user.userId) : undefined

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'

  const [customerCount, oppCount, contractThisMonth, receivedThisMonth, followUpCount, taskCount, expiringCount,
    newCustomerThisMonth, newOppThisMonth, oppTotalAmount,
    contractClosedThisMonth,
    pendingCollection, invoicedUnpaid, invoicedPaid,
    commissionTotal, commissionUnpaid, commissionPaid,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(customers).where(isNull(customers.deletedAt)),
    db.select({ count: sql<number>`count(*)` }).from(opportunities).where(and(
      isNull(opportunities.deletedAt),
      ne(opportunities.status, 'closed_won'),
      ne(opportunities.status, 'closed_lost'),
      ownerWhere,
    )),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(contracts).where(and(
      isNull(contracts.deletedAt),
      gte(contracts.createdAt, monthStart),
    )),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments).where(gte(payments.paymentDate, monthStart)),
    db.select({ count: sql<number>`count(*)` }).from(followUps).where(lte(followUps.nextFollowUpAt, today)),
    db.select({ count: sql<number>`count(*)` }).from(tasks).where(and(eq(tasks.status, 'todo'), isNotNull(tasks.endDate))),
    db.select({ count: sql<number>`count(*)` }).from(contracts).where(and(isNull(contracts.deletedAt), isNotNull(contracts.endDate), gte(contracts.endDate, today), lte(contracts.endDate, new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)))),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(and(isNull(customers.deletedAt), gte(customers.createdAt, monthStart))),
    db.select({ count: sql<number>`count(*)` }).from(opportunities).where(and(
      isNull(opportunities.deletedAt),
      gte(opportunities.createdAt, monthStart),
      ownerWhere,
    )),
    db.select({ total: sql<number>`coalesce(sum(estimated_amount), 0)` }).from(opportunities).where(and(
      isNull(opportunities.deletedAt),
      ne(opportunities.status, 'closed_lost'),
      ownerWhere,
    )),
    db.select({ total: sql<number>`coalesce(sum(total_amount), 0)` }).from(contracts).where(and(isNull(contracts.deletedAt), eq(contracts.status, 'completed'), gte(contracts.updatedAt, monthStart))),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(payments),
    db.select({ total: sql<number>`coalesce(sum(invoices.amount), 0)` }).from(invoices).where(and(
      eq(invoices.status, 'issued'),
      eq(sql`(select count(*) from payments where payments.contract_id = invoices.contract_id)`, 0),
    )),
    db.select({ total: sql<number>`coalesce(sum(invoices.amount), 0)` }).from(invoices).where(and(
      eq(invoices.status, 'issued'),
      sql`(select count(*) from payments where payments.contract_id = invoices.contract_id) > 0`,
    )),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(commissions).where(eq(commissions.status, 'approved')),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(commissions).where(eq(commissions.status, 'pending')),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(commissions).where(eq(commissions.status, 'paid')),
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
      .where(and(
        isNull(opportunities.deletedAt),
        ne(opportunities.status, 'closed_won'),
        ne(opportunities.status, 'closed_lost'),
        ownerWhere,
      ))
      .orderBy(desc(opportunities.createdAt)).limit(5),
    db.select({
      status: opportunities.status,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(estimated_amount), 0)`,
    }).from(opportunities).where(and(
      isNull(opportunities.deletedAt),
      ownerWhere,
    )).groupBy(opportunities.status),
  ])

  const funnelTotal = funnelRows.reduce((sum: number, r: any) => sum + Number(r.count), 0)

  return {
    code: 0,
    data: {
      kpi: {
        customerTotal: Number(customerCount[0]?.count || 0),
        opportunityInProgress: Number(oppCount[0]?.count || 0),
        contractAmountThisMonth: Number(contractThisMonth[0]?.total || 0),
        receivedAmountThisMonth: Number(receivedThisMonth[0]?.total || 0),
        newCustomersThisMonth: Number(newCustomerThisMonth[0]?.count || 0),
        newOppsThisMonth: Number(newOppThisMonth[0]?.count || 0),
        oppTotalAmount: Number(oppTotalAmount[0]?.total || 0),
        contractClosedThisMonth: Number(contractClosedThisMonth[0]?.total || 0),
        totalCollection: Number(pendingCollection[0]?.total || 0),
        invoicedUnpaid: Number(invoicedUnpaid[0]?.total || 0),
        invoicedPaid: Number(invoicedPaid[0]?.total || 0),
        commissionTotal: Number(commissionTotal[0]?.total || 0),
        commissionUnpaid: Number(commissionUnpaid[0]?.total || 0),
        commissionPaid: Number(commissionPaid[0]?.total || 0),
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
