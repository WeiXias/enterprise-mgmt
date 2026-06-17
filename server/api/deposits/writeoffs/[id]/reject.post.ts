import { defineEventHandler, getRouterParam, createError } from 'h3'
import { db } from '#database'
import { depositWriteOffs } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 422, statusMessage: '缺少核销 ID' })

  const wo = await db.select({ status: depositWriteOffs.status }).from(depositWriteOffs)
    .where(and(eq(depositWriteOffs.id, id), isNull(depositWriteOffs.deletedAt))).limit(1)
  if (!wo[0]) throw createError({ statusCode: 404, statusMessage: '核销申请不存在' })
  if (wo[0].status !== 'pending') throw createError({ statusCode: 422, statusMessage: '只能驳回待处理的申请' })

  await db.update(depositWriteOffs).set({
    status: 'rejected',
    approvedBy: user.userId,
    approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }).where(eq(depositWriteOffs.id, id))

  return { code: 0, data: null, message: '已驳回' }
})
