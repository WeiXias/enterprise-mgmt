import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  note: z.string().optional(),
  priority: z.enum(['urgent_important', 'urgent_not_important', 'important_not_urgent', 'not_urgent_not_important']).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  listId: z.string().optional(),
  dueDate: z.string().optional().or(z.literal('')),
  remindAt: z.string().optional().or(z.literal('')),
  customerId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  opportunityId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: todos.id }).from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.userId), isNull(todos.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '待办不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }

  for (const key of ['title', 'priority', 'status', 'listId', 'sortOrder'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  if (parsed.data.note !== undefined) updateData.note = parsed.data.note
  for (const key of ['dueDate', 'remindAt'] as const) {
    if (parsed.data[key] === '') updateData[key] = null
    else if (parsed.data[key]) updateData[key] = parsed.data[key]
  }
  // nullable 业务关联字段：null 表示清除
  for (const key of ['customerId', 'contractId', 'projectId', 'opportunityId'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }
  if (parsed.data.status === 'completed') updateData.completedAt = now

  await db.update(todos).set(updateData).where(eq(todos.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'todo', targetId: id, detail: '更新了待办' })
  return { code: 0, data: null, message: '已保存' }
})