import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todoSubtasks } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { subtaskId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: todoSubtasks.id }).from(todoSubtasks)
    .where(and(eq(todoSubtasks.id, subtaskId), isNull(todoSubtasks.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '子任务不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }
  for (const key of ['title', 'completed', 'sortOrder'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }

  await db.update(todoSubtasks).set(updateData).where(eq(todoSubtasks.id, subtaskId))
  return { code: 0, data: null, message: '已保存' }
})