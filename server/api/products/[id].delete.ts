import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { products } from '#schema'
import { eq, isNull, and } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: products.id, status: products.status }).from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '产品不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(products).set({ deletedAt: now, updatedAt: now }).where(eq(products.id, id))

  await logOperation(event, { action: 'DELETE', module: 'product', targetId: id, detail: '删除了产品' })

  return { code: 0, data: null, message: '已删除' }
})
