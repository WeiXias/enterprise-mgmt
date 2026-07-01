import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { customers, opportunities, users } from '#schema'
import { eq, and, isNull, count, ne, gte, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'customer:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'

  const where: any[] = [isNull(customers.deletedAt)]
  const oppWhere: any[] = [isNull(opportunities.deletedAt)]
  if (user.role === 'sales_member') {
    where.push(eq(customers.ownerUserId, user.userId))
    oppWhere.push(eq(opportunities.ownerUserId, user.userId))
  }

  const [overview, statusRows, ownerRows, industryRows] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      newThisMonth: sql<number>`sum(case when ${customers.createdAt} >= ${monthStart} then 1 else 0 end)`,
    }).from(customers).where(and(...where)),
    db.select({ status: customers.status, count: count() }).from(customers)
      .where(and(...where)).groupBy(customers.status),
    db.select({ ownerUserId: customers.ownerUserId, count: count(), name: users.name }).from(customers)
      .leftJoin(users, eq(customers.ownerUserId, users.id))
      .where(and(...where)).groupBy(customers.ownerUserId, users.name),
    db.select({ industry: customers.industry, count: count() }).from(customers)
      .where(and(...where, ne(customers.industry, ''))).groupBy(customers.industry),
  ])

  const o = overview[0]

  // 商机汇总
  const oppOverview = await db.select({
    total: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(${opportunities.estimatedAmount})`,
    wonCount: sql<number>`sum(case when ${opportunities.status} = 'closed_won' then 1 else 0 end)`,
    inProgressCount: sql<number>`sum(case when ${opportunities.status} not in ('closed_won','closed_lost') then 1 else 0 end)`,
    newThisMonth: sql<number>`sum(case when ${opportunities.createdAt} >= ${monthStart} then 1 else 0 end)`,
  }).from(opportunities).where(and(...oppWhere))
  const oo = oppOverview[0]

  // 最近商机
  const recentOpps = await db.select({
    id: opportunities.id,
    name: opportunities.name,
    estimatedAmount: opportunities.estimatedAmount,
    status: opportunities.status,
    customerName: customers.name,
  }).from(opportunities)
    .leftJoin(customers, eq(opportunities.customerId, customers.id))
    .where(and(...oppWhere))
    .orderBy(sql`${opportunities.updatedAt} desc`)
    .limit(5)

  // 最近客户
  const recentCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    status: customers.status,
    ownerName: users.name,
    createdAt: customers.createdAt,
  }).from(customers)
    .leftJoin(users, eq(customers.ownerUserId, users.id))
    .where(and(...where))
    .orderBy(sql`${customers.createdAt} desc`)
    .limit(5)

  return {
    code: 0,
    data: {
      total: Number(o?.total || 0),
      newThisMonth: Number(o?.newThisMonth || 0),
      byStatus: statusRows.map((r: any) => ({ status: r.status, count: Number(r.count) })),
      byOwner: ownerRows.map((r: any) => ({ ownerId: r.ownerUserId, name: r.name, count: Number(r.count) })),
      byIndustry: industryRows.filter((r: any) => r.industry).map((r: any) => ({ industry: r.industry, count: Number(r.count) })),
      oppTotal: Number(oo?.total || 0),
      oppTotalAmount: Number(oo?.totalAmount || 0),
      oppWonCount: Number(oo?.wonCount || 0),
      oppInProgressCount: Number(oo?.inProgressCount || 0),
      oppNewThisMonth: Number(oo?.newThisMonth || 0),
      recentOpps: recentOpps.map((r: any) => ({
        id: r.id, name: r.name, estimatedAmount: r.estimatedAmount, status: r.status, customerName: r.customerName,
      })),
      recentCustomers: recentCustomers.map((r: any) => ({
        id: r.id, name: r.name, status: r.status, ownerName: r.ownerName, createdAt: r.createdAt,
      })),
    }
  }
})
