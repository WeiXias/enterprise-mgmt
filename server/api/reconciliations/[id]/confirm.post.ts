import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '#database'
import { reconciliations, reconciliationItems, payments } from '#schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少对账单 ID' })

  const r = await db.select({ status: reconciliations.status }).from(reconciliations)
    .where(and(eq(reconciliations.id, id), isNull(reconciliations.deletedAt))).limit(1)
  if (!r[0]) throw createError({ statusCode: 404, statusMessage: '对账单不存在' })
  if (r[0].status !== 'pending') throw createError({ statusCode: 422, statusMessage: '只能确认待确认的对账单' })

  // 获取关联的回款记录
  const items = await db.select({ paymentId: reconciliationItems.paymentId })
    .from(reconciliationItems).where(eq(reconciliationItems.reconciliationId, id))
  const paymentIds = items.map(i => i.paymentId)

  const now = new Date().toISOString()

  // 更新对账单状态
  await db.update(reconciliations).set({
    status: 'confirmed',
    confirmedBy: user.userId,
    confirmedAt: now,
    updatedAt: now,
  }).where(eq(reconciliations.id, id))

  // 锁定关联的回款记录
  if (paymentIds.length > 0) {
    await db.update(payments).set({
      reconciledAt: now,
      reconciledById: user.userId,
    }).where(inArray(payments.id, paymentIds))
  }

  return { code: 0, data: null, message: '对账已确认' }
})
