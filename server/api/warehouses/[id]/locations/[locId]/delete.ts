import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { warehouseLocations } from '#schema'
import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { locId } = getRouterParams(event)
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(warehouseLocations).set({ deletedAt: now }).where(eq(warehouseLocations.id, locId))
  return { code: 0, data: null, message: '库位已删除' }
})
