import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { financeTransactions } from '#schema'
import { and, isNull, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const year = (query.year as string) || new Date().toISOString().slice(0, 4)

  const rows = await db.all(
    `select strftime('%Y-%m', transaction_date) as month,
     coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income,
     coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expense
     from finance_transactions
     where deleted_at is null and transaction_date like '${year}%'
     group by strftime('%Y-%m', transaction_date)
     order by month`
  ) as { month: string; income: number; expense: number; profit: number }[]

  const items = rows.map((r: { month: string; income: number; expense: number; profit: number }) => ({
    month: r.month,
    income: Number(r.income),
    expense: Number(r.expense),
    profit: Number(r.income) - Number(r.expense),
  }))

  const totals = items.reduce((acc: { totalIncome: number; totalExpense: number; totalProfit: number }, r: { month: string; income: number; expense: number; profit: number }) => {
    acc.income += r.income
    acc.expense += r.expense
    acc.profit += r.profit
    return acc
  }, { income: 0, expense: 0, profit: 0 })

  return { code: 0, data: { year, items, totals } }
})
