import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({ name: z.string().min(1).max(200), description: z.string().optional() })

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.insert(deliverables).values({
    id: generateId(),
    projectId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    status: 'pending',
    createdAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'deliverable', targetId: result[0].id, detail: `创建了交付物「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '交付物已添加' }
})
