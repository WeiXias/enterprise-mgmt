import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todoSubtasks } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ title: z.string().min(1, '子任务标题不能为空').max(200) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  // 获取当前最大 sortOrder
  const existing = await db.select({ sortOrder: todoSubtasks.sortOrder }).from(todoSubtasks)
    .where(and(eq(todoSubtasks.todoId, id), isNull(todoSubtasks.deletedAt)))
    .orderBy(todoSubtasks.sortOrder)

  const maxOrder = existing.length > 0 ? Math.max(...existing.map((e: any) => e.sortOrder)) : 0

  const subtaskId = generateId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(todoSubtasks).values({
    id: subtaskId,
    todoId: id,
    title: parsed.data.title,
    completed: false,
    sortOrder: maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  })

  return { code: 0, data: { id: subtaskId }, message: '子任务已添加' }
})
