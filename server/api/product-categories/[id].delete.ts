import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product-category:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: dictEntries.id }).from(dictEntries)
    .where(eq(dictEntries.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(dictEntries).set({ deletedAt: now } as any).where(eq(dictEntries.id, id))
  return { code: 0, message: '分类已删除' }
})
