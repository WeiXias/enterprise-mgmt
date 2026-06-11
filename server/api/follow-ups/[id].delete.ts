import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { followUps } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: followUps.id }).from(followUps)
    .where(and(eq(followUps.id, id), isNull(followUps.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '跟进记录不存在' })

  await db.update(followUps).set({ deletedAt: new Date() }).where(eq(followUps.id, id))
  await logOperation(event, { action: 'DELETE', module: 'followup', targetId: id, detail: '删除了跟进记录' })
  return { code: 0, data: null, message: '跟进记录已删除' }
})
