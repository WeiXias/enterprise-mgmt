import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'opportunity:delete')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select().from(quotes).where(and(eq(quotes.id, id), isNull(quotes.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报价不存在' })

  const q = existing[0]

  // 已发送的报价不允许删除（仅管理员可删）
  if (q!.status !== 'draft' && user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '已发送的报价仅管理员可删除' })
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  // 先删关联的产品明细
  await db.update(quoteProducts).set({ deletedAt: now } as any).where(eq(quoteProducts.quoteId, id))
  await db.update(quotes).set({ deletedAt: now }).where(eq(quotes.id, id))
  await logOperation(event, { action: 'DELETE', module: 'quote', targetId: id, detail: `删除了报价` })

  return { code: 0, data: null, message: '报价已删除' }
})
