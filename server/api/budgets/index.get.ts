import { defineEventHandler, getQuery, createError } from 'h3'
import { db } from '#database'
import { budgets, financeTransactions, projects, financeCategories } from '#schema'
import { eq, and, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const year = Number(query.year) || new Date().getFullYear()
  const categoryFilter = query.category as string | undefined
  const typeFilter = query.type as string | undefined

  const where: any[] = [eq(budgets.year, year)]
  if (categoryFilter) where.push(eq(budgets.category, categoryFilter))
  if (typeFilter) where.push(eq(budgets.type, typeFilter))

  const list = await db.select({
    id: budgets.id,
    name: budgets.name,
    year: budgets.year,
    month: budgets.month,
    type: budgets.type,
    category: budgets.category,
    amount: budgets.amount,
    projectId: budgets.projectId,
    projectName: sql<string>`(select name from projects where projects.id = ${budgets.projectId})`,
    departmentId: budgets.departmentId,
    remark: budgets.remark,
    createdAt: budgets.createdAt,
    // 实际执行金额：从 finance_transactions 中按分类汇总
    actualAmount: sql<number>`coalesce((
      select sum(amount) from finance_transactions ft
      where ft.category = ${budgets.category}
      and ft.deleted_at is null
      and substr(ft.transaction_date, 1, 4) = cast(${budgets.year} as text)
    ), 0)`,
  }).from(budgets)
    .where(and(...where))
    .orderBy(desc(budgets.createdAt))
    .limit(pageSize).offset((page - 1) * pageSize)

  const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(budgets).where(and(...where))

  return {
    code: 0,
    data: {
      items: list.map(b => ({
        ...b,
        amount: Number(b.amount),
        actualAmount: Number(b.actualAmount),
        usagePercent: Number(b.amount) > 0 ? Math.round(Number(b.actualAmount) / Number(b.amount) * 100) : 0,
      })),
      total: Number(totalResult?.count || 0),
      page, pageSize,
      totalPages: Math.ceil(Number(totalResult?.count || 0) / pageSize),
    },
  }
})
