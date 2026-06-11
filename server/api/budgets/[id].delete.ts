import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db } from '#database'
import { budgets } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '缺少预算ID' })

  await db.delete(budgets).where(eq(budgets.id, id))
  return { code: 0, data: null, message: '预算已删除' }
})
