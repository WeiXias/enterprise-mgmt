import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200),
  assigneeId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  remark: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'task:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: projectId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const result = await db.insert(tasks).values({
    id: generateId(),
    projectId,
    name: parsed.data.name,
    assigneeId: parsed.data.assigneeId || null,
    priority: parsed.data.priority || 'medium',
    status: 'todo',
    startDate: parsed.data.startDate || null,
    endDate: parsed.data.endDate || null,
    remark: parsed.data.remark || null,
    progress: 0,
    createdAt: now,
    updatedAt: now,
  }).returning()

  await logOperation(event, { action: 'CREATE', module: 'task', targetId: result[0].id, detail: `创建了任务「${parsed.data.name}」` })

  return { code: 0, data: result[0], message: '任务已创建' }
})
