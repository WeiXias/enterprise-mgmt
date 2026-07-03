import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { accountingPeriods, accounts, accountBalances, vouchers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')
  const { id } = getRouterParams(event)

  const period = await db.select().from(accountingPeriods).where(eq(accountingPeriods.id, id)).limit(1)
  if (period.length === 0) throw createError({ statusCode: 404, statusMessage: '会计期间不存在' })
  if (period[0].isClosed === 1) throw createError({ statusCode: 409, statusMessage: '该期间已结账' })

  // 检查是否有未过账的凭证
  const pendingVouchers = await db.select({ id: vouchers.id }).from(vouchers)
    .where(and(isNull(vouchers.deletedAt), eq(vouchers.periodId, id), eq(vouchers.status, 'approved'))).limit(1)
  if (pendingVouchers.length > 0) throw createError({ statusCode: 409, statusMessage: '该期间还有已审核未过账的凭证' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 结转损益：收入/费用科目余额 → 本年利润
  // 1. 汇总收入类科目余额（贷方余额）
  const revenueAccounts = await db.select({ id: accounts.id, code: accounts.code })
    .from(accounts).where(eq(accounts.categoryType, 'revenue_expense'))
  const revenueIds = revenueAccounts.filter(a => ['5001', '5051', '5111', '5301'].some(prefix => a.code.startsWith(prefix.replace('.', '\\.'))))

  // 获取所有损益类科目的余额汇总
  const revenueBalances = await db.all(
    `select ab.account_id, ab.closing_debit, ab.closing_credit, ac.code
     from account_balances ab join accounts ac on ac.id = ab.account_id
     where ab.period_id = ? and ac.category_type = 'revenue_expense'`,
    [id]
  ) as { account_id: string; closing_debit: number; closing_credit: number; code: string }[]

  let totalRevenue = 0   // 收入类科目贷方余额合计
  let totalExpense = 0   // 费用类科目借方余额合计

  for (const rb of revenueBalances) {
    // 贷方余额科目是收入，借方余额科目是费用
    if (rb.closing_credit > rb.closing_debit) totalRevenue += (rb.closing_credit - rb.closing_debit)
    if (rb.closing_debit > rb.closing_credit) totalExpense += (rb.closing_debit - rb.closing_credit)
  }

  // 如果本期有利得，生成结转凭证：借:收入类科目 贷:本年利润
  // 结转费用：借:本年利润 贷:费用类科目
  if (totalRevenue > 0 || totalExpense > 0) {
    const { createAutoVoucher } = await import('#server-utils/accounting/posting')

    const entries: any[] = []

    for (const rb of revenueBalances) {
      if (rb.closing_credit > rb.closing_debit) {
        // 收入类科目：结平 = 借:收入科目
        entries.push({ accountCode: rb.code, debitAmount: rb.closing_credit - rb.closing_debit, creditAmount: 0, summary: '结转收入' })
      }
      if (rb.closing_debit > rb.closing_credit) {
        // 费用类科目：结平 = 贷:费用科目
        entries.push({ accountCode: rb.code, debitAmount: 0, creditAmount: rb.closing_debit - rb.closing_credit, summary: '结转费用' })
      }
    }

    // 差额计入本年利润
    const netProfit = totalRevenue - totalExpense
    if (netProfit > 0) {
      entries.push({ accountCode: '3103', debitAmount: 0, creditAmount: netProfit, summary: '结转本年利润' })
    } else if (netProfit < 0) {
      entries.push({ accountCode: '3103', debitAmount: Math.abs(netProfit), creditAmount: 0, summary: '结转本年利润' })
    }

    await createAutoVoucher(db, {
      voucherDate: period[0].endDate,
      summary: `${period[0].year}年${period[0].month}月 期末结转损益`,
      sourceType: 'period_close',
      periodId: id,
      entries,
    }, user.userId)
  }

  // 标记期间为已关闭
  await db.update(accountingPeriods).set({
    isClosed: 1,
    closedBy: user.userId,
    closedAt: now,
  }).where(eq(accountingPeriods.id, id))

  await logOperation(event, { action: 'CLOSE', module: 'accounting', targetId: id, detail: `${period[0].year}年${period[0].month}月结账` })
  return { code: 0, data: { totalRevenue, totalExpense, netProfit: totalRevenue - totalExpense }, message: '已结账' }
})
