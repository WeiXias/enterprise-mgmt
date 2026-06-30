import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

const schema = z.object({ items: z.array(z.object({ id: z.string(), sortOrder: z.number() })) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:edit')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  for (const item of parsed.data.items) {
    await db.update(todos).set({ sortOrder: item.sortOrder, updatedAt: now }).where(eq(todos.id, item.id))
  }
  await logOperation(event, { action: 'UPDATE', module: 'todo', detail: '调整了待办排序' })
  return { code: 0, data: null, message: '顺序已更新' }
})