import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { timeLogs } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })
  const { id } = getRouterParams(event)

  const [existing] = await db.select().from(timeLogs).where(and(eq(timeLogs.id, id), isNull(timeLogs.deletedAt)))
  if (!existing) throw createError({ statusCode: 404, statusMessage: '记录不存在' })
  if (existing.userId !== user.userId && user.role !== 'admin') throw createError({ statusCode: 403 })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(timeLogs).set({ deletedAt: now, updatedAt: now }).where(eq(timeLogs.id, id))
  await logOperation(event, { action: 'DELETE', module: 'project', targetId: id, detail: `删除工时记录` })
  return { code: 0, data: null, message: '已删除' }
})
