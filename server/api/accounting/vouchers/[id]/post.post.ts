import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { vouchers } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { postVoucherToBalance } from '#server-utils/accounting/posting'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:manage')
  const { id } = getRouterParams(event)

  const existing = await db.select({ status: vouchers.status, periodId: vouchers.periodId }).from(vouchers).where(eq(vouchers.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '凭证不存在' })
  if (existing[0].status !== 'approved') throw createError({ statusCode: 403, statusMessage: '只能过账已审核的凭证' })
  if (!existing[0].periodId) throw createError({ statusCode: 422, statusMessage: '凭证未关联会计期间' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await postVoucherToBalance(db, id, existing[0].periodId)

  await db.update(vouchers).set({
    status: 'posted',
    postedAt: now,
    updatedAt: now,
  }).where(eq(vouchers.id, id))

  await logOperation(event, { action: 'POST', module: 'accounting', targetId: id, detail: '凭证过账' })
  return { code: 0, message: '已过账' }
})
