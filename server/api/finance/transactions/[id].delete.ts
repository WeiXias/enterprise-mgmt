import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { financeTransactions } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: financeTransactions.id, sourceType: financeTransactions.sourceType })
    .from(financeTransactions).where(eq(financeTransactions.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '记录不存在' })
  if (existing[0].sourceType !== 'manual') throw createError({ statusCode: 400, statusMessage: '自动生成的记录不能删除' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(financeTransactions).set({ deletedAt: now }).where(eq(financeTransactions.id, id))
  await logOperation(event, { action: 'DELETE', module: 'finance', targetId: id, detail: '删除了财务流水' })
  return { code: 0, data: null, message: '已删除' }
})
