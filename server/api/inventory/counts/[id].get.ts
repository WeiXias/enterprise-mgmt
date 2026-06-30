import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryCounts } from '#schema'
import { warehouses } from '#schema/warehouses'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const [record] = await db.select({
    id: inventoryCounts.id,
    code: inventoryCounts.code,
    status: inventoryCounts.status,
    warehouseId: inventoryCounts.warehouseId,
    warehouseName: warehouses.name,
    plannedDate: inventoryCounts.plannedDate,
    createdAt: inventoryCounts.createdAt,
    completedAt: inventoryCounts.completedAt,
    remark: inventoryCounts.remark,
  }).from(inventoryCounts)
    .leftJoin(warehouses, eq(inventoryCounts.warehouseId, warehouses.id))
    .where(and(eq(inventoryCounts.id, id), isNull(inventoryCounts.deletedAt)))
    .limit(1)

  if (!record) throw createError({ statusCode: 404, statusMessage: '盘点计划不存在' })

  return { code: 0, data: record }
})
