import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { eq, isNull, and } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: tags.id }).from(tags).where(and(eq(tags.id, id), isNull(tags.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '标签不存在' })

  await db.update(tags).set({ deletedAt: new Date() }).where(eq(tags.id, id))
  await logOperation(event, { action: 'DELETE', module: 'tag', targetId: id, detail: '删除了标签' })
  return { code: 0, data: null, message: '标签已删除' }
})
