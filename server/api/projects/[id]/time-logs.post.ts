import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { timeLogs } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  taskId: z.string().optional(),
  date: z.string().min(1),
  hours: z.number().positive().max(24),
  description: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })
  const { id: projectId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const id = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.insert(timeLogs).values({
    id, projectId,
    taskId: parsed.data.taskId || null,
    userId: user.userId,
    date: parsed.data.date,
    hours: parsed.data.hours,
    description: parsed.data.description || null,
    status: 'draft',
    createdAt: now, updatedAt: now,
  })
  await logOperation(event, { action: 'CREATE', module: 'project', targetId: id, detail: `记录工时 ${parsed.data.hours}h` })

  const [item] = await db.select().from(timeLogs).where(eq(timeLogs.id, id))
  return { code: 0, data: item }
})
