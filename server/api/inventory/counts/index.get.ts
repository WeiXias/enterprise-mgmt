import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { inventoryCounts, inventoryCountItems } from '#schema'
import { warehouses } from '#schema/warehouses'
import { eq, and, isNull, like, count, asc, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const status = query.status as string | undefined
  const sortBy = (query.sortBy as string) || 'createdAt'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const where: any[] = [isNull(inventoryCounts.deletedAt)]
  if (keyword) where.push(like(inventoryCounts.code, `%${keyword}%`))
  if (status) where.push(eq(inventoryCounts.status, status))

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    code: inventoryCounts.code, status: inventoryCounts.status,
    createdAt: inventoryCounts.createdAt, plannedDate: inventoryCounts.plannedDate,
  }
  const orderColumn = sortColumns[sortBy] || inventoryCounts.createdAt

  const [list, totalResult] = await Promise.all([
    db.select({
      id: inventoryCounts.id,
      code: inventoryCounts.code,
      status: inventoryCounts.status,
      warehouseId: inventoryCounts.warehouseId,
      warehouseName: warehouses.name,
      plannedDate: inventoryCounts.plannedDate,
      completedAt: inventoryCounts.completedAt,
      createdAt: inventoryCounts.createdAt,
      remark: inventoryCounts.remark,
    }).from(inventoryCounts)
      .leftJoin(warehouses, eq(inventoryCounts.warehouseId, warehouses.id))
      .where(and(...where))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(orderFn(orderColumn)),
    db.select({ count: count() }).from(inventoryCounts).where(and(...where)),
  ])

  // 批量获取各盘点单的明细行数
  const countIds = list.map((c: any) => c.id)
  let itemCountMap: Record<string, number> = {}
  if (countIds.length > 0) {
    const rows = await db.select({
      countId: inventoryCountItems.countId,
      cnt: count(),
    }).from(inventoryCountItems)
      .where(and(inArray(countIds, inventoryCountItems.countId), isNull(inventoryCountItems.deletedAt)))
      .groupBy(inventoryCountItems.countId)
    rows.forEach((r: any) => { itemCountMap[r.countId] = Number(r.cnt) })
  }

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((c: any) => ({ ...c, itemCount: itemCountMap[c.id] || 0 })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
