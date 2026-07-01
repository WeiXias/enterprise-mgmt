import { defineEventHandler, createError } from 'h3'
import { db } from '#database'
import { contracts, paymentPlans, payments, commissions, reimbursements, commissionPayouts, financeTransactions } from '#schema'
import { and, isNull, sql, eq, desc, gte, lte } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'finance:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const today = now.slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'

  // Stats
  const [incomePayments, incomeManual, expensePayouts, expenseManual, overdueResult, pendingReimbursementResult] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments),
    db.select({ total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` }).from(financeTransactions).where(and(isNull(financeTransactions.deletedAt), eq(financeTransactions.type, 'income'))),
    db.select({ total: sql<number>`coalesce(sum(${commissionPayouts.totalAmount}), 0)` }).from(commissionPayouts).where(eq(commissionPayouts.status, 'confirmed')),
    db.select({ total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` }).from(financeTransactions).where(and(isNull(financeTransactions.deletedAt), eq(financeTransactions.type, 'expense'))),
    db.select({ overdue: sql<number>`count(*)` }).from(paymentPlans).where(and(eq(paymentPlans.status, 'pending'), sql`${paymentPlans.planDate} < ${today}`)),
    db.select({ count: sql<number>`count(*)` }).from(reimbursements).where(eq(reimbursements.status, 'pending')),
  ])

  const totalIncome = Number(incomePayments[0]?.total || 0) + Number(incomeManual[0]?.total || 0)
  const totalExpenseRaw = Number(expensePayouts[0]?.total || 0) + Number(expenseManual[0]?.total || 0)

  // Recent transactions: payments + commission payouts + manual finance_transactions
  const [recentPayments, recentPayouts, recentManual] = await Promise.all([
    db.select({
      id: payments.id,
      type: sql<string>`'income'`,
      amount: payments.amount,
      category: sql<string>`'合同收款'`,
      sourceType: sql<string>`'contract_payment'`,
      sourceId: payments.id,
      contractId: payments.contractId,
      transactionDate: payments.paymentDate,
      description: payments.remark,
      paymentMethod: payments.paymentMethod,
      createdAt: sql<string>`${payments.createdAt}`,
    }).from(payments).orderBy(desc(payments.createdAt)).limit(10),
    db.select({
      id: commissionPayouts.id,
      type: sql<string>`'expense'`,
      amount: commissionPayouts.totalAmount,
      category: sql<string>`'提成发放'`,
      sourceType: sql<string>`'commission_payout'`,
      sourceId: commissionPayouts.id,
      contractId: sql<string>`null`,
      transactionDate: sql<string>`${commissionPayouts.createdAt}`,
      description: sql<string>`'提成发放 - ' || ${commissionPayouts.periodMonth}`,
      paymentMethod: sql<string>`null`,
      createdAt: commissionPayouts.createdAt,
    }).from(commissionPayouts).where(eq(commissionPayouts.status, 'confirmed')).orderBy(desc(commissionPayouts.createdAt)).limit(10),
    db.select({
      id: financeTransactions.id,
      type: financeTransactions.type,
      amount: financeTransactions.amount,
      category: financeTransactions.category,
      sourceType: financeTransactions.sourceType,
      sourceId: financeTransactions.sourceId,
      contractId: financeTransactions.contractId,
      transactionDate: financeTransactions.transactionDate,
      description: financeTransactions.description,
      paymentMethod: financeTransactions.paymentMethod,
      createdAt: financeTransactions.createdAt,
    }).from(financeTransactions).where(isNull(financeTransactions.deletedAt)).orderBy(desc(financeTransactions.createdAt)).limit(10),
  ])

  const recentTransactions = [...recentPayments, ...recentPayouts, ...recentManual]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 10)

  // Overdue payments detail with overdueDays
  const overdueRows = await db.select({
    id: paymentPlans.id,
    amount: paymentPlans.amount,
    planDate: paymentPlans.planDate,
    contractName: contracts.name,
    contractCode: contracts.code,
    customerName: sql<string>`(select name from customers where customers.id = contracts.customer_id)`,
  }).from(paymentPlans)
    .leftJoin(contracts, eq(paymentPlans.contractId, contracts.id))
    .where(and(eq(paymentPlans.status, 'pending'), sql`${paymentPlans.planDate} < ${today}`))
    .limit(20)

  const overduePayments = overdueRows.map((row: any) => ({
    ...row,
    overdueDays: Math.max(0, Math.floor((Date.now() - new Date(row.planDate!).getTime()) / 86400000)),
  }))

  // Pending reimbursements
  const pendingReimbursements = await db.select({
    id: reimbursements.id,
    type: reimbursements.type,
    amount: reimbursements.amount,
    reason: reimbursements.reason,
    status: reimbursements.status,
    userName: sql<string>`(select name from users where users.id = ${reimbursements.userId})`,
    createdAt: reimbursements.createdAt,
  }).from(reimbursements).where(eq(reimbursements.status, 'pending')).orderBy(desc(reimbursements.createdAt)).limit(20)

  return {
    code: 0,
    data: {
      stats: {
        totalIncome,
        totalExpense: totalExpenseRaw,
        netBalance: totalIncome - totalExpenseRaw,
        overduePaymentCount: Number(overdueResult[0]?.overdue || 0),
        pendingReimbursementCount: Number(pendingReimbursementResult[0]?.count || 0),
      },
      overduePayments,
      pendingReimbursements,
      recentTransactions,
    }
  }
})
