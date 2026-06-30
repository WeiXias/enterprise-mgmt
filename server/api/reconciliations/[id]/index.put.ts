import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { db } from '#database'
import { reconciliations } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'reconciliation:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少对账单 ID' })

  const r = await db.select({ status: reconciliations.status }).from(reconciliations)
    .where(and(eq(reconciliations.id, id), isNull(reconciliations.deletedAt))).limit(1)
  if (!r[0]) throw createError({ statusCode: 404, statusMessage: '对账单不存在' })
  if (r[0].status !== 'pending') throw createError({ statusCode: 422, statusMessage: '只能编辑待确认的对账单' })

  const body = await readBody(event)
  await db.update(reconciliations).set({
    remark: body.remark,
    updatedAt: new Date().toISOString(),
  }).where(eq(reconciliations.id, id))

  return { code: 0, data: null, message: '已保存' }
})
