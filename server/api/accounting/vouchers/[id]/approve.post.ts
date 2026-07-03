import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { vouchers } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')
  const { id } = getRouterParams(event)

  const existing = await db.select({ status: vouchers.status }).from(vouchers).where(eq(vouchers.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '凭证不存在' })
  if (existing[0].status !== 'reviewed') throw createError({ statusCode: 403, statusMessage: '只能审核已复核的凭证' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(vouchers).set({
    status: 'approved',
    approvedBy: user.userId,
    approvedAt: now,
    updatedAt: now,
  }).where(eq(vouchers.id, id))

  await logOperation(event, { action: 'APPROVE', module: 'accounting', targetId: id, detail: '审核通过凭证' })
  return { code: 0, message: '审核已通过' }
})
