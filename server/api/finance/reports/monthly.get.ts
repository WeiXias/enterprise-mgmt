import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { financeTransactions } from '#schema'
import { and, isNull, sql } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  await requirePermission(event, 'finance:read')
  const year = (query.year as string) || new Date().toISOString().slice(0, 4)

  const rows = await db.all(
    `select strftime('%Y-%m', transaction_date) as month,
     coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income,
     coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expense
     from finance_transactions
     where deleted_at is null and transaction_date like ?1
     group by strftime('%Y-%m', transaction_date)
     order by month`,
    `${year}%`
  ) as { month: string; income: number; expense: number; profit: number }[]

  const items = rows.map((r: { month: string; income: number; expense: number; profit: number }) => ({
    month: r.month,
    income: Number(r.income),
    expense: Number(r.expense),
    profit: Number(r.income) - Number(r.expense),
  }))

  const totals = items.reduce((acc, r) => {
    acc.totalIncome += r.income
    acc.totalExpense += r.expense
    acc.totalProfit += r.profit
    return acc
  }, { totalIncome: 0, totalExpense: 0, totalProfit: 0 })

  return { code: 0, data: { year, items, totals } }
})
