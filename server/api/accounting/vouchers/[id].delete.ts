import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { vouchers } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')
  const { id } = getRouterParams(event)

  const existing = await db.select({ status: vouchers.status }).from(vouchers).where(eq(vouchers.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '凭证不存在' })
  if (existing[0].status !== 'draft') throw createError({ statusCode: 403, statusMessage: '只能删除草稿状态的凭证' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(vouchers).set({ deletedAt: now, updatedAt: now }).where(eq(vouchers.id, id))

  await logOperation(event, { action: 'DELETE', module: 'accounting', targetId: id, detail: '删除凭证' })
  return { code: 0, message: '已删除' }
})
