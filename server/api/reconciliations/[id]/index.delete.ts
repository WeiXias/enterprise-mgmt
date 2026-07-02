import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '#database'
import { reconciliations } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'reconciliation:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少对账单 ID' })

  const r = await db.select({ id: reconciliations.id }).from(reconciliations)
    .where(and(eq(reconciliations.id, id), isNull(reconciliations.deletedAt))).limit(1)
  if (!r[0]) throw createError({ statusCode: 404, statusMessage: '对账单不存在' })

  await db.update(reconciliations).set({ deletedAt: new Date().toISOString() }).where(eq(reconciliations.id, id))

  return { code: 0, data: null, message: '已删除' }
})
