import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ taskIds: z.array(z.string()).min(1).max(50) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401 })
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(tasks).set({ deletedAt: now, updatedAt: now }).where(inArray(tasks.id, parsed.data.taskIds))
  await logOperation(event, { action: 'DELETE', module: 'project', targetId: parsed.data.taskIds[0], detail: `批量删除 ${parsed.data.taskIds.length} 个任务` })

  return { code: 0, data: { deleted: parsed.data.taskIds.length } }
})
