import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { payments } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: payments.id }).from(payments).where(eq(payments.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '收款记录不存在' })
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(payments).set({ deletedAt: now }).where(eq(payments.id, id))

  await logOperation(event, { action: 'DELETE', module: 'payment', targetId: id, detail: '删除了收款记录' })

  return { code: 0, data: null, message: '收款记录已删除' }
})
