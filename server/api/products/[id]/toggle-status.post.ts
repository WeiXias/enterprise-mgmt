import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { products } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: products.id, status: products.status }).from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '产品不存在' })

  const newStatus = existing[0].status === 'on_sale' ? 'off_shelf' : 'on_sale'
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(products).set({ status: newStatus, updatedAt: now }).where(eq(products.id, id))

  await logOperation(event, { action: 'UPDATE', module: 'product', targetId: id, detail: '切换了产品状态' })

  return {
    code: 0,
    data: { status: newStatus },
    message: newStatus === 'on_sale' ? '已重新上架' : '已下架',
  }
})
