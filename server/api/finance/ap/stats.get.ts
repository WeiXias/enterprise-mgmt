import { defineEventHandler, createError } from 'h3'
import { rawDb } from '#database'
import { purchaseOrders } from '#schema'
import { requirePermission } from '#server-utils/permission'

// Keep schema reference for type-level documentation
void purchaseOrders

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'finance:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'

  const [totalResult, overdueResult, newThisMonthResult] = [
    rawDb.prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
       FROM purchase_orders
       WHERE deleted_at IS NULL`
    ).get() as any,
    rawDb.prepare(
      `SELECT COUNT(*) as count
       FROM purchase_orders
       WHERE deleted_at IS NULL
         AND expected_date < ?
         AND status NOT IN ('completed', 'cancelled')`
    ).get(today) as any,
    rawDb.prepare(
      `SELECT COUNT(*) as count
       FROM purchase_orders
       WHERE deleted_at IS NULL
         AND created_at >= ?`
    ).get(monthStart) as any,
  ]

  return {
    code: 0,
    data: {
      total: totalResult?.count || 0,
      totalAmount: Number(totalResult?.amount || 0),
      overdueCount: overdueResult?.count || 0,
      newThisMonth: newThisMonthResult?.count || 0,
    },
  }
})
