import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { productCategories, products } from '#schema'
import { eq, count } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: productCategories.id }).from(productCategories)
    .where(eq(productCategories.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '分类不存在' })

  // 检查分类下是否有产品
  const productCount = await db.select({ count: count() }).from(products)
    .where(eq(products.categoryId, id))
  if (Number(productCount[0]?.count || 0) > 0) {
    throw createError({ statusCode: 400, statusMessage: '分类下还有产品，不能删除' })
  }

  await db.delete(productCategories).where(eq(productCategories.id, id))

  await logOperation(event, { action: 'DELETE', module: 'category', targetId: id, detail: '删除了产品分类' })

  return { code: 0, data: null, message: '已删除' }
})
