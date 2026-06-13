import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event) as { name?: string; sort?: string }

  const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
    .where(eq(dictEntries.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  const updates: Record<string, string> = { updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') }
  if (body.name !== undefined) { updates.label = body.name; updates.value = body.name }
  if (body.sort !== undefined) updates.sort = body.sort

  await db.update(dictEntries).set(updates).where(eq(dictEntries.id, id))
  return { code: 0, message: '分类已更新' }
})
