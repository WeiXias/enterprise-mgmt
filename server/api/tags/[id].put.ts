import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ name: z.string().min(1).max(50).optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional() })

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: tags.id }).from(tags).where(and(eq(tags.id, id), isNull(tags.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '标签不存在' })

  const result = await db.update(tags).set({ ...parsed.data, updatedAt: new Date() }).where(eq(tags.id, id)).returning()
  await logOperation(event, { action: 'UPDATE', module: 'tag', targetId: id, detail: '更新了标签' })
  return { code: 0, data: result[0], message: '标签已更新' }
})
