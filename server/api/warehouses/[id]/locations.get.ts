import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { warehouseLocations } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const list = await db.select().from(warehouseLocations)
    .where(and(eq(warehouseLocations.warehouseId, id), isNull(warehouseLocations.deletedAt)))
  return { code: 0, data: list }
})
