import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { inventoryCounts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'inventory:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const [existing] = await db.select({ id: inventoryCounts.id, status: inventoryCounts.status }).from(inventoryCounts)
    .where(and(eq(inventoryCounts.id, id), isNull(inventoryCounts.deletedAt)))
    .limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: '盘点计划不存在' })
  if (existing.status !== 'draft') throw createError({ statusCode: 422, statusMessage: '只有草稿状态的盘点才能开始' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(inventoryCounts).set({ status: 'counting', updatedAt: now }).where(eq(inventoryCounts.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'product', targetId: id, detail: '开始了盘点' })
  return { code: 0, data: null, message: '盘点已开始' }
})
