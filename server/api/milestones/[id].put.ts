import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { milestones } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  targetDate: z.string().optional(),
  description: z.string().optional(),
  completedAt: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '里程碑不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }

  for (const key of ['name', 'targetDate', 'description', 'completedAt', 'sortOrder'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }

  await db.update(milestones).set(updateData).where(eq(milestones.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'milestone', targetId: id, detail: '更新了里程碑' })
  return { code: 0, data: null, message: '已保存' }
})
