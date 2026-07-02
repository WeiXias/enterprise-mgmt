import { defineEventHandler, createError } from 'h3'
import { rawDb } from '#database'
import { paymentPlans, contracts, customers } from '#schema'
import { requirePermission } from '#server-utils/permission'

// Keep schema references for type-level documentation
void paymentPlans; void contracts; void customers

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'finance:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  // Total AR: all pending + overdue plans (not deleted, with valid contract & customer)
  const totalResult = rawDb.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(pp.amount), 0) as amount
     FROM payment_plans pp
     JOIN contracts ct ON ct.id = pp.contract_id
     JOIN customers cu ON cu.id = ct.customer_id
     WHERE pp.deleted_at IS NULL
       AND pp.status IN ('pending', 'overdue')
       AND ct.deleted_at IS NULL
       AND cu.deleted_at IS NULL`
  ).get() as any

  // Overdue: planDate < today AND status = 'pending'
  const overdueResult = rawDb.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(pp.amount), 0) as amount
     FROM payment_plans pp
     JOIN contracts ct ON ct.id = pp.contract_id
     JOIN customers cu ON cu.id = ct.customer_id
     WHERE pp.deleted_at IS NULL
       AND pp.status = 'pending'
       AND pp.plan_date < date('now')
       AND ct.deleted_at IS NULL
       AND cu.deleted_at IS NULL`
  ).get() as any

  // Expiring soon: planDate between today and today+30 days AND status = 'pending'
  const expiringResult = rawDb.prepare(
    `SELECT COUNT(*) as count
     FROM payment_plans pp
     JOIN contracts ct ON ct.id = pp.contract_id
     JOIN customers cu ON cu.id = ct.customer_id
     WHERE pp.deleted_at IS NULL
       AND pp.status = 'pending'
       AND pp.plan_date >= date('now')
       AND pp.plan_date <= date('now', '+30 days')
       AND ct.deleted_at IS NULL
       AND cu.deleted_at IS NULL`
  ).get() as any

  return {
    code: 0,
    data: {
      total: totalResult?.count || 0,
      totalAmount: Number(totalResult?.amount || 0),
      overdueCount: overdueResult?.count || 0,
      overdueAmount: Number(overdueResult?.amount || 0),
      expiringSoon: expiringResult?.count || 0,
    },
  }
})
