import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { projects, contracts, financeTransactions } from '#schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const projectId = query.projectId as string | undefined

  const whereP: ReturnType<typeof isNull>[] = [isNull(projects.deletedAt)]
  if (projectId) whereP.push(eq(projects.id, projectId))

  const projectList = await db.select({
    id: projects.id,
    name: projects.name,
    contractId: projects.contractId,
  }).from(projects).where(and(...whereP))

  const items = await Promise.all(projectList.map(async (p: any) => {
    // Income: from financeTransactions linked to contract of this project
    let income = 0
    if (p.contractId) {
      const incomeResult = await db.all(
        `select coalesce(sum(amount), 0) as total from finance_transactions
         where deleted_at is null and type = 'income' and contract_id = ?`,
        [p.contractId]
      ) as { projectId: string; projectName: string }[]
      income = Number(incomeResult[0]?.total || 0)
    }

    // Expense: from financeTransactions linked to this project directly
    const expenseResult = await db.all(
      `select coalesce(sum(amount), 0) as total from finance_transactions
       where deleted_at is null and type = 'expense' and project_id = ?`,
      [p.id]
    ) as { projectId: string; projectName: string }[]
    const expense = Number(expenseResult[0]?.total || 0)

    return {
      projectId: p.id,
      projectName: p.name,
      income,
      expense,
      profit: income - expense,
    }
  }))

  return { code: 0, data: { items } }
})
