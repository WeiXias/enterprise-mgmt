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
  const total = await db.select({
    count: sql<number>`count(*)`,
    wonCount: sql<number>`sum(case when ${opportunities.status} = 'closed_won' then 1 else 0 end)`,
    totalAmount: sql<number>`sum(${opportunities.estimatedAmount})`,
    wonAmount: sql<number>`sum(case when ${opportunities.status} = 'closed_won' then ${opportunities.estimatedAmount} else 0 end)`,
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
      winRate: totalCount > 0 ? Math.round(wonCount / totalCount * 100) : 0,
      totalAmount: Number(t?.totalAmount || 0),
      wonAmount: Number(t?.wonAmount || 0),
      byStatus: byStatus.map((r: any) => ({
        status: r.status,
        count: Number(r.count),
        totalAmount: Number(r.totalAmount || 0),
      })),
    }
  }
})
