import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { financeTransactions, contracts } from '#schema'
import { eq, like, and, isNull, desc, gte, lte } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const where: any[] = [isNull(financeTransactions.deletedAt)]
  if (query.keyword) where.push(like(financeTransactions.description, `%${query.keyword}%`))
  if (query.type) where.push(eq(financeTransactions.type, query.type as string))
  if (query.startDate) where.push(gte(financeTransactions.transactionDate, query.startDate as string))
  if (query.endDate) where.push(lte(financeTransactions.transactionDate, query.endDate as string))

  const list = await db.select({
    date: financeTransactions.transactionDate,
    type: financeTransactions.type,
    category: financeTransactions.category,
    amount: financeTransactions.amount,
    description: financeTransactions.description,
    contractName: contracts.name,
  }).from(financeTransactions)
    .leftJoin(contracts, eq(financeTransactions.contractId, contracts.id))
    .where(and(...where)).orderBy(desc(financeTransactions.transactionDate))

  // Generate CSV
  const headers = '日期,类型,分类,金额,说明,关联合同'
  const rows = list.map((r: any) =>
    `${r.date},${r.type === 'income' ? '收入' : '支出'},${r.category},${r.amount},"${r.description || ''}","${r.contractName || ''}"`
  )
  const csv = [headers, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=finance-${new Date().toISOString().slice(0, 10)}.csv`,
    }
  })
})
