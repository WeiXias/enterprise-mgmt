import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { warehouseLocations } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const list = await db.select().from(warehouseLocations)
    .where(and(eq(warehouseLocations.warehouseId, id), isNull(warehouseLocations.deletedAt)))
    .limit(pageSize).offset((page - 1) * pageSize)

  return { code: 0, data: list }
})
