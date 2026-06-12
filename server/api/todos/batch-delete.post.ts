import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { todos } from '#schema/todos'
import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({ todoIds: z.array(z.string()).min(1).max(50) })

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(todos).set({ deletedAt: now, updatedAt: now }).where(inArray(todos.id, parsed.data.todoIds))
  await logOperation(event, { action: 'DELETE', module: 'todo', targetId: parsed.data.todoIds[0], detail: `批量删除 ${parsed.data.todoIds.length} 个待办` })

  return { code: 0, data: { deleted: parsed.data.todoIds.length } }
})