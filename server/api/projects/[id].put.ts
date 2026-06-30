import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { projects } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  budget: z.number().min(0).optional(),
  remark: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'delayed']).optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:edit')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.id, id), isNull(projects.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '项目不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }

  for (const key of ['name', 'budget', 'remark', 'status'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  for (const key of ['startDate', 'endDate']) {
    if (parsed.data[key] === '') updateData[key] = null
    else if (parsed.data[key]) updateData[key] = parsed.data[key]
  }

  await db.update(projects).set(updateData).where(eq(projects.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'project', targetId: id, detail: `更新了项目「${parsed.data.name}」` })
  return { code: 0, data: null, message: '已保存，随时可以改' }
})
