import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  progress: z.number().min(0).max(100).optional(),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '任务不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }

  for (const key of ['name', 'assigneeId', 'priority', 'status', 'progress', 'remark'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  for (const key of ['startDate', 'endDate']) {
    if (parsed.data[key] === '') updateData[key] = null
    else if (parsed.data[key]) updateData[key] = parsed.data[key]
  }
  if (parsed.data.status === 'completed') updateData.progress = 100

  await db.update(tasks).set(updateData).where(eq(tasks.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'task', targetId: id, detail: '更新了任务' })
  return { code: 0, data: null, message: '已保存' }
})
