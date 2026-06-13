import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报价不存在' })

  const q = existing[0]

  // 已发送的报价不允许删除（仅管理员可删）
  if (q!.status !== 'draft' && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '已发送的报价仅管理员可删除' })
  }

  // 先删关联的产品明细
  await db.delete(quoteProducts).where(eq(quoteProducts.quoteId, id))
  await db.delete(quotes).where(eq(quotes.id, id))
  await logOperation(event, { action: 'DELETE', module: 'quote', targetId: id, detail: `删除了报价` })

  return { code: 0, data: null, message: '报价已删除' }
})
