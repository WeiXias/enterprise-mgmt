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
  if (!['reviewed', 'approved'].includes(existing[0].status)) throw createError({ statusCode: 403, statusMessage: '只能驳回已复核或已审核的凭证' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(vouchers).set({
    status: 'draft',
    reviewedBy: null,
    approvedBy: null,
    reviewedAt: null,
    approvedAt: null,
    updatedAt: now,
  }).where(eq(vouchers.id, id))

  await logOperation(event, { action: 'REJECT', module: 'accounting', targetId: id, detail: '驳回凭证' })
  return { code: 0, message: '已驳回' }
})
