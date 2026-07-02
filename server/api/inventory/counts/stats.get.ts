import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { inventoryCounts } from '#schema'
import { sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const totals = await db.select({
    total: sql<number>`count(*)`,
    pendingCount: sql<number>`sum(case when ${inventoryCounts.status} != 'completed' then 1 else 0 end)`,
    completedCount: sql<number>`sum(case when ${inventoryCounts.status} = 'completed' then 1 else 0 end)`,
  }).from(inventoryCounts)

  const t = totals[0]
  return {
    code: 0,
    data: {
      total: Number(t?.total || 0),
      pendingCount: Number(t?.pendingCount || 0),
      completedCount: Number(t?.completedCount || 0),
    },
  }
})
