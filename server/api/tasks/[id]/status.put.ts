import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ status: z.enum(['todo', 'in_progress', 'completed']) })

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '状态不对' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { status: parsed.data.status, updatedAt: now }
  if (parsed.data.status === 'completed') updateData.progress = 100

  await db.update(tasks).set(updateData).where(eq(tasks.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'task', targetId: id, detail: '更新了任务状态' })
  return { code: 0, data: null, message: '状态已更新' }
})
