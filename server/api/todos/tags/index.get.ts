import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { todoTags } from '#schema/todos'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'todo:read')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // 返回当前用户的所有标签
  const tags = await db.select().from(todoTags)
    .where(eq(todoTags.userId, user.userId))
    .orderBy(todoTags.name)

  return { code: 0, data: tags }
})