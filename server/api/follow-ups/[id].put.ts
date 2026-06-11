import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { followUps } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { FollowUpType } from '#enums'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  type: z.enum(Object.values(FollowUpType) as [string, ...string[]]).optional(),
  content: z.string().min(1).optional(),
  nextFollowUpAt: z.string().optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: followUps.id }).from(followUps)
    .where(and(eq(followUps.id, id), isNull(followUps.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '跟进记录不存在' })

  const now = new Date()
  const result = await db.update(followUps).set({
    ...parsed.data,
    nextFollowUpAt: parsed.data.nextFollowUpAt === '' ? null : parsed.data.nextFollowUpAt ? new Date(parsed.data.nextFollowUpAt) : undefined,
    updatedAt: now,
  }).where(eq(followUps.id, id)).returning()

  await logOperation(event, { action: 'UPDATE', module: 'followup', targetId: id, detail: '更新了跟进记录' })

  return { code: 0, data: result[0], message: '已保存' }
})
