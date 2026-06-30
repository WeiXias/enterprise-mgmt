import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todoLists } from '#schema/todos'
import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.enum(['amber', 'teal', 'blue', 'coral', 'stone', 'violet']).optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: todoLists.id }).from(todoLists)
    .where(and(eq(todoLists.id, id), eq(todoLists.userId, user.userId), isNull(todoLists.deletedAt)))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '清单不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const updateData: Record<string, unknown> = { updatedAt: now }
  for (const key of ['name', 'color', 'icon', 'sortOrder'] as const) {
    if (parsed.data[key] !== undefined) updateData[key] = parsed.data[key]
  }

  await db.update(todoLists).set(updateData).where(eq(todoLists.id, id))
  await logOperation(event, { action: 'UPDATE', module: 'todo_list', targetId: id, detail: '更新了清单' })
  return { code: 0, data: null, message: '已保存' }
})