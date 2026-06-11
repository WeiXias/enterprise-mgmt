import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { codeRules } from '#schema/system'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const body = await readBody(event)
  if (!Array.isArray(body)) throw createError({ statusCode: 422, statusMessage: '参数格式错误' })

  for (const item of body) {
    if (item.module) {
      await db.update(codeRules).set({ currentSeq: String(item.sort ?? 0) }).where(eq(codeRules.module, item.module))
    }
  }

  return { code: 0, data: null, message: '排序已更新' }
})
