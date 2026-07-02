import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { invoices } from '#schema'
import { and, isNull, sql, eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'invoice:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const totals = await db.select({
    totalCount: sql<number>`count(*)`,
    totalAmount: sql<number>`coalesce(sum(${invoices.amount}), 0)`,
    pendingCount: sql<number>`sum(case when ${invoices.status} = 'pending' then 1 else 0 end)`,
    issuedCount: sql<number>`sum(case when ${invoices.status} = 'issued' then 1 else 0 end)`,
    voidedCount: sql<number>`sum(case when ${invoices.status} = 'voided' then 1 else 0 end)`,
    pendingAmount: sql<number>`coalesce(sum(case when ${invoices.status} = 'pending' then ${invoices.amount} else 0 end), 0)`,
    issuedAmount: sql<number>`coalesce(sum(case when ${invoices.status} = 'issued' then ${invoices.amount} else 0 end), 0)`,
  }).from(invoices)

  const t = totals[0]
  return {
    code: 0,
    data: {
      total: Number(t?.totalCount || 0),
      totalAmount: Number(t?.totalAmount || 0),
      pendingCount: Number(t?.pendingCount || 0),
      issuedCount: Number(t?.issuedCount || 0),
      voidedCount: Number(t?.voidedCount || 0),
      pendingAmount: Number(t?.pendingAmount || 0),
      issuedAmount: Number(t?.issuedAmount || 0),
    }
  }
})
