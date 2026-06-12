import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { todoTags, todoTagRelations } from '#schema/todos'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: todoTags.id }).from(todoTags)
    .where(eq(todoTags.id, id))
    .limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '标签不存在' })

  // 删除关联关系
  await db.delete(todoTagRelations).where(eq(todoTagRelations.tagId, id))
  // 删除标签
  await db.delete(todoTags).where(eq(todoTags.id, id))

  await logOperation(event, { action: 'DELETE', module: 'todo_tag', targetId: id, detail: '删除了标签' })
  return { code: 0, data: null, message: '标签已删除' }
})