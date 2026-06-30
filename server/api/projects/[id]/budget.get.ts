import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { projects, contracts, payments, timeLogs } from '#schema'
import { eq, and, isNull, sum, count } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'budget:read')
  const { id } = getRouterParams(event)

  const [project] = await db.select({
    budget: projects.budget,
    contractId: projects.contractId,
  }).from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt)))
  if (!project) return { code: 0, data: null }

  // 合同收款
  let totalIncome = 0
  if (project.contractId) {
    const incomeRows = await db.select({ amount: sum(payments.amount) })
      .from(payments).where(eq(payments.contractId, project.contractId))
    totalIncome = Number(incomeRows[0]?.amount || 0)
  }

  // 该项目下的工时汇总（成本估算）
  const timeRows = await db.select({
    totalHours: sum(timeLogs.hours),
    count: count(),
  }).from(timeLogs).where(and(eq(timeLogs.projectId, id), isNull(timeLogs.deletedAt), eq(timeLogs.status, 'approved')))
  const totalHours = Number(timeRows[0]?.totalHours || 0)

  const budget = Number(project.budget) || 0
  // 人工成本估算：按每小时 500 元
  const estimatedCost = totalHours * 500
  const remaining = budget - estimatedCost
  const budgetUsage = budget > 0 ? Math.round((estimatedCost / budget) * 100) : 0

  return {
    code: 0,
    data: {
      budget,
      income: totalIncome,
      estimatedCost,
      estimatedHours: totalHours,
      remaining,
      budgetUsage,
      isWarn: budgetUsage >= 80,
    }
  }
})
