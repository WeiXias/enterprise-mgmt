import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { todoTags } from '#schema/todos'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { logOperation } from '#server-utils/log'

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select({ id: todoTags.id }).from(todoTags)
    .where(eq(todoTags.id, id))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '标签不存在' })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color

  if (Object.keys(updateData).length > 0) {
    await db.update(todoTags).set(updateData).where(eq(todoTags.id, id))
    await logOperation(event, { action: 'UPDATE', module: 'todo_tag', targetId: id, detail: '更新了标签' })
  }
  return { code: 0, data: null, message: '已保存' }
})