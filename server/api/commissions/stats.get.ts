import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { commissions, users } from '#schema'
import { sql, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'commission:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const stats = await db.select({
    totalAmount: sql<number>`coalesce(sum(${commissions.amount}), 0)`,
    paidAmount: sql<number>`coalesce(sum(case when ${commissions.status} = 'paid' then ${commissions.amount} else 0 end), 0)`,
    pendingAmount: sql<number>`coalesce(sum(case when ${commissions.status} = 'pending' then ${commissions.amount} else 0 end), 0)`,
  }).from(commissions).where(isNull(commissions.deletedAt))

  const s = stats[0]

  // 按人员汇总
  const byUser = await db.select({
    userId: commissions.userId,
    userName: sql<string>`(select name from users where users.id = ${commissions.userId})`,
    totalAmount: sql<number>`sum(${commissions.amount})`,
    count: sql<number>`count(*)`,
  }).from(commissions).where(isNull(commissions.deletedAt)).groupBy(commissions.userId)

  // 按月份汇总
  const byMonth = await db.select({
    periodMonth: commissions.periodMonth,
    totalAmount: sql<number>`sum(${commissions.amount})`,
    count: sql<number>`count(*)`,
  }).from(commissions).where(isNull(commissions.deletedAt)).groupBy(commissions.periodMonth).orderBy(sql`${commissions.periodMonth} desc`)

  return {
    code: 0,
    data: {
      totalAmount: Number(s?.totalAmount || 0),
      paidAmount: Number(s?.paidAmount || 0),
      pendingAmount: Number(s?.pendingAmount || 0),
      byUser: byUser.map((u: any) => ({ ...u, totalAmount: Number(u.totalAmount), count: Number(u.count) })),
      byMonth: byMonth.map((m: any) => ({ ...m, totalAmount: Number(m.totalAmount), count: Number(m.count) })),
    },
  }
})
