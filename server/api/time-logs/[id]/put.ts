import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { timeLogs } from '#schema'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  date: z.string().optional(),
  hours: z.number().positive().max(24).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })
  const { id } = getRouterParams(event)

  const [existing] = await db.select().from(timeLogs).where(and(eq(timeLogs.id, id), isNull(timeLogs.deletedAt)))
  if (!existing) throw createError({ statusCode: 404, statusMessage: '记录不存在' })
  if (existing.userId !== user.userId && user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: '无权修改' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(timeLogs).set({ ...parsed.data, updatedAt: now }).where(eq(timeLogs.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'project', targetId: id, detail: `更新工时记录` })

  const [updated] = await db.select().from(timeLogs).where(eq(timeLogs.id, id))
  return { code: 0, data: updated }
})
