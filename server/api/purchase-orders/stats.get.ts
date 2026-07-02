import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { purchaseOrders } from '#schema'
import { and, isNull, sql } from 'drizzle-orm'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'purchase-order:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')

  const row = await db.select({
    total: sql<number>`count(*)`,
    totalAmount: sql<number>`coalesce(sum(${purchaseOrders.totalAmount}), 0)`,
    pendingCount: sql<number>`sum(case when ${purchaseOrders.status} not in ('received', 'cancelled') then 1 else 0 end)`,
    newThisMonth: sql<number>`sum(case when ${purchaseOrders.createdAt} >= ${monthStart} then 1 else 0 end)`,
  }).from(purchaseOrders).where(isNull(purchaseOrders.deletedAt))

  const r = row[0]

  return {
    code: 0,
    data: {
      total: Number(r?.total || 0),
      totalAmount: Number(r?.totalAmount || 0),
      pendingCount: Number(r?.pendingCount || 0),
      newThisMonth: Number(r?.newThisMonth || 0),
    }
  }
})
