import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { risks } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const [existing] = await db.select().from(risks).where(and(eq(risks.id, id), isNull(risks.deletedAt)))
  if (!existing) throw createError({ statusCode: 404, statusMessage: '风险不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(risks).set({ deletedAt: now, updatedAt: now }).where(eq(risks.id, id))
  await logOperation(event, { action: 'DELETE', module: 'project', targetId: id })
  return { code: 0, data: null, message: '已删除' }
})
