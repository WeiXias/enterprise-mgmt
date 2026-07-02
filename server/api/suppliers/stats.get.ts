import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { suppliers } from '#schema'
import { and, isNull, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'supplier:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const baseWhere = isNull(suppliers.deletedAt)

  // 总数、活跃数、本月新增
  const statsRow = await db.select({
    total: sql<number>`count(*)`,
    activeCount: sql<number>`sum(case when ${suppliers.status} = 'active' then 1 else 0 end)`,
    newThisMonth: sql<number>`sum(case when ${suppliers.createdAt} >= ${monthStart} then 1 else 0 end)`,
  }).from(suppliers).where(baseWhere)

  // 按状态分组
  const statusRows = await db.select({
    status: suppliers.status,
    count: sql<number>`count(*)`,
  }).from(suppliers).where(baseWhere).groupBy(suppliers.status)

  const byStatus: Record<string, number> = {}
  for (const row of statusRows) {
    if (row.status) {
      byStatus[row.status] = Number(row.count)
    }
  }

  const s = statsRow[0]

  return {
    code: 0,
    data: {
      total: Number(s?.total || 0),
      activeCount: Number(s?.activeCount || 0),
      newThisMonth: Number(s?.newThisMonth || 0),
      byStatus,
    },
  }
})
