import { defineEventHandler, getRouterParams, readBody } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
  completedAt: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return { code: 1, message: parsed.error.issues[0].message }
  await db.update(tasks).set(parsed.data).where(eq(tasks.id, id))
  return { code: 0, data: null }
})
