import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const list = await db.select().from(commissionRules)
  return { code: 0, data: list }
})
