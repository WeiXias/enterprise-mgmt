import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { commissions } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'commission:manage')
  const { id } = getRouterParams(event)
  const [existing] = await db.select({ id: commissions.id }).from(commissions).where(eq(commissions.id, id)).limit(1)
  if (!existing) throw createError({ statusCode: 404, statusMessage: '提成记录不存在' })
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(commissions).set({ deletedAt: now }).where(eq(commissions.id, id))
  await logOperation(event, { action: 'DELETE', module: 'commission', targetId: id, detail: '删除了提成记录' })
  return { code: 0, message: '提成记录已删除' }
})
