import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { dictEntries } from '#schema'
import { eq, isNull, and } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: tags.id, name: tags.name }).from(tags).where(and(eq(tags.id, id), isNull(tags.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '标签不存在' })

  await db.update(tags).set({ deletedAt: new Date() }).where(eq(tags.id, id))
  // 同步删除 dict_entries 中的记录
  await db.delete(dictEntries).where(and(eq(dictEntries.dict_type, 'customer_tag'), eq(dictEntries.label, existing[0].name)))
  await logOperation(event, { action: 'DELETE', module: 'tag', targetId: id, detail: '删除了标签' })
  return { code: 0, data: null, message: '标签已删除' }
})
