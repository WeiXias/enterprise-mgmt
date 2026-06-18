import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
    .where(eq(dictEntries.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(dictEntries).set({ deletedAt: now }).where(eq(dictEntries.id, id))
  await logOperation(event, { action: 'DELETE', module: 'finance', targetId: id, detail: '删除了财务分类' })
  return { code: 0, message: '分类已删除' }
})
