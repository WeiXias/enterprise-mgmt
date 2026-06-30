import { defineEventHandler } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, asc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const incomeRows = await db.select({
  await requirePermission(event, 'finance:read')
    id: dictEntries.id,
    name: dictEntries.label,
    sort: dictEntries.sort,
  }).from(dictEntries)
    .where(eq(dictEntries.dict_type, 'finance_income_category'))
    .orderBy(asc(dictEntries.sort), asc(dictEntries.label))

  const expenseRows = await db.select({
    id: dictEntries.id,
    name: dictEntries.label,
    sort: dictEntries.sort,
  }).from(dictEntries)
    .where(eq(dictEntries.dict_type, 'finance_expense_category'))
    .orderBy(asc(dictEntries.sort), asc(dictEntries.label))

  return {
    code: 0,
    data: {
      income: incomeRows.map(r => ({ id: r.id, name: r.name, sort: r.sort })),
      expense: expenseRows.map(r => ({ id: r.id, name: r.name, sort: r.sort })),
    }
  }
})
