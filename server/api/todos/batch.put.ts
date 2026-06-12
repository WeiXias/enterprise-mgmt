import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  todoIds: z.array(z.string()).min(1).max(50),
  changes: z.object({
    status: z.enum(['todo', 'in_progress', 'completed']).optional(),
    priority: z.enum(['urgent_important', 'urgent_not_important', 'important_not_urgent', 'not_urgent_not_important']).optional(),
    listId: z.string().optional(),
  }),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { ...parsed.data.changes, updatedAt: now }
  if (parsed.data.changes.status === 'completed') updateData.completedAt = now

  await db.update(todos).set(updateData).where(inArray(todos.id, parsed.data.todoIds))
  await logOperation(event, { action: 'UPDATE', module: 'todo', targetId: parsed.data.todoIds[0], detail: `批量更新 ${parsed.data.todoIds.length} 个待办` })

  return { code: 0, data: { updated: parsed.data.todoIds.length } }
})