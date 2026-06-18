import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryCounts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const [existing] = await db.select({ id: inventoryCounts.id }).from(inventoryCounts)
    .where(and(eq(inventoryCounts.id, id), isNull(inventoryCounts.deletedAt)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: '盘点计划不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(inventoryCounts).set({ deletedAt: now, updatedAt: now }).where(eq(inventoryCounts.id, id))

  await logOperation(event, { action: 'DELETE', module: 'product', targetId: id, detail: '删除了盘点计划' })
  return { code: 0, data: null, message: '已删除' }
})
