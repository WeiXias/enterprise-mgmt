import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { opportunities } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)

  const existing = await db.select({
    id: opportunities.id,
    ownerUserId: opportunities.ownerUserId,
    status: opportunities.status,
  }).from(opportunities)
    .where(and(eq(opportunities.id, id), isNull(opportunities.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '商机不存在' })

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  await db.update(opportunities).set({ deletedAt: now }).where(eq(opportunities.id, id))
  await logOperation(event, { action: 'DELETE', module: 'opportunity', targetId: id, detail: `删除了商机` })
  return { code: 0, data: null, message: '已删除' }
})
