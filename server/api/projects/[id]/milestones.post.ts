import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { milestones } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1),
  targetDate: z.string(),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: projectId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.insert(milestones).values({
    id: generateId(),
    projectId,
    name: parsed.data.name,
    targetDate: parsed.data.targetDate,
    description: parsed.data.description || null,
    sortOrder: parsed.data.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'project', targetId: result[0].id, detail: `创建了里程碑「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '里程碑已创建' }
})
