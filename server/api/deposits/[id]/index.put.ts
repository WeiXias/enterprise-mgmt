import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { db } from '#database'
import { payments } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少订金 ID' })

  const p = await db.select({ id: payments.id, type: payments.type, refundedAt: payments.refundedAt })
    .from(payments).where(and(eq(payments.id, id), isNull(payments.deletedAt))).limit(1)
  if (!p[0]) throw createError({ statusCode: 404, statusMessage: '订金记录不存在' })
  if (p[0].refundedAt) throw createError({ statusCode: 422, statusMessage: '已退款的订金不能编辑' })

  const body = await readBody(event)
  await db.update(payments).set({
    amount: body.amount,
    remainingAmount: body.amount,
    paymentDate: body.paymentDate,
    paymentMethod: body.paymentMethod,
    remark: body.remark,
  }).where(eq(payments.id, id))

  return { code: 0, data: null, message: '已保存' }
})
