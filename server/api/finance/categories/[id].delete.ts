import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  await db.delete(dictEntries).where(eq(dictEntries.id, id))
  return { code: 0, message: '分类已删除' }
})
