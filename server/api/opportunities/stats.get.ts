import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { and, eq, isNull, desc, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:view')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const isSalesMember = user.role === 'sales_member'
  const ownerWhere = isSalesMember ? eq(opportunities.ownerUserId, user.userId) : undefined

  // 按状态统计
  const byStatus = await db.select({
    status: opportunities.status,
    count: sql<number>`count(*)`,
    totalAmount: sql<number>`sum(${opportunities.estimatedAmount})`,
  }).from(opportunities).where(and(
    isNull(opportunities.deletedAt),
    ownerWhere,
  )).groupBy(opportunities.status)

  // 总览
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const total = await db.select({
    count: sql<number>`count(*)`,
    wonCount: sql<number>`sum(case when ${opportunities.status} = 'closed_won' then 1 else 0 end)`,
    lostCount: sql<number>`sum(case when ${opportunities.status} = 'closed_lost' then 1 else 0 end)`,
    inProgressCount: sql<number>`sum(case when ${opportunities.status} not in ('closed_won','closed_lost') then 1 else 0 end)`,
    totalAmount: sql<number>`sum(${opportunities.estimatedAmount})`,
    wonAmount: sql<number>`sum(case when ${opportunities.status} = 'closed_won' then ${opportunities.estimatedAmount} else 0 end)`,
    lostAmount: sql<number>`sum(case when ${opportunities.status} = 'closed_lost' then ${opportunities.estimatedAmount} else 0 end)`,
    inProgressAmount: sql<number>`sum(case when ${opportunities.status} not in ('closed_won','closed_lost') then ${opportunities.estimatedAmount} else 0 end)`,
    newThisMonth: sql<number>`sum(case when ${opportunities.createdAt} >= ${monthStart} then 1 else 0 end)`,
    expiringSoon: sql<number>`sum(case when ${opportunities.status} not in ('closed_won','closed_lost') and ${opportunities.estimatedCloseDate} is not null and ${opportunities.estimatedCloseDate} >= ${today} and ${opportunities.estimatedCloseDate} <= ${thirtyDaysLater} then 1 else 0 end)`,
  }).from(opportunities).where(and(
    isNull(opportunities.deletedAt),
    ownerWhere,
  ))

  const t = total[0]
  const totalCount = Number(t?.count || 0)
  const wonCount = Number(t?.wonCount || 0)

  return {
    code: 0,
    data: {
      total: totalCount,
      wonCount,
      lostCount: Number(t?.lostCount || 0),
      inProgressCount: Number(t?.inProgressCount || 0),
      winRate: totalCount > 0 ? Math.round(wonCount / totalCount * 100) : 0,
      totalAmount: Number(t?.totalAmount || 0),
      wonAmount: Number(t?.wonAmount || 0),
      lostAmount: Number(t?.lostAmount || 0),
      inProgressAmount: Number(t?.inProgressAmount || 0),
      newThisMonth: Number(t?.newThisMonth || 0),
      expiringSoon: Number(t?.expiringSoon || 0),
      byStatus: byStatus.map((r: any) => ({
        status: r.status,
        count: Number(r.count),
        totalAmount: Number(r.totalAmount || 0),
      })),
    }
  }
})
