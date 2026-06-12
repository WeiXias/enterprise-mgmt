import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ status: z.enum(['todo', 'in_progress', 'completed']) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: '状态不对' })

  const existing = await db.select({ id: todos.id }).from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.userId), isNull(todos.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '待办不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { status: parsed.data.status, updatedAt: now }
  if (parsed.data.status === 'completed') updateData.completedAt = now
  else updateData.completedAt = null

  await db.update(todos).set(updateData).where(eq(todos.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'todo', targetId: id, detail: `状态变更为${parsed.data.status === 'completed' ? '已完成' : parsed.data.status === 'in_progress' ? '进行中' : '待办'}` })
  return { code: 0, data: null, message: '状态已更新' }
})