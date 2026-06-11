import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  taskIds: z.array(z.string()).min(1).max(50),
  changes: z.object({
    status: z.enum(['todo', 'in_progress', 'completed']).optional(),
    assigneeId: z.string().nullable().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  }),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const updateData: Record<string, unknown> = { ...parsed.data.changes }
  if (parsed.data.changes.status === 'completed') {
    updateData.completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  updateData.updatedAt = now

  await db.update(tasks).set(updateData).where(inArray(tasks.id, parsed.data.taskIds))
  await logOperation(event, { action: 'UPDATE', module: 'project', targetId: parsed.data.taskIds[0], detail: `批量更新 ${parsed.data.taskIds.length} 个任务` })

  return { code: 0, data: { updated: parsed.data.taskIds.length } }
})
