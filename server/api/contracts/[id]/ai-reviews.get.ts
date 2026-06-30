import { defineEventHandler, getRouterParams, getQuery, createError } from 'h3'
import { db } from '#database'
import { aiReviews, aiEmployees } from '#schema/ai'
import { eq, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id: contractId } = getRouterParams(event)
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 50)

  const list = await db.select({
    id: aiReviews.id,
    contractId: aiReviews.contractId,
    aiEmployeeId: aiReviews.aiEmployeeId,
    aiEmployeeName: aiEmployees.name,
    status: aiReviews.status,
    result: aiReviews.result,
    modelUsed: aiReviews.modelUsed,
    duration: aiReviews.duration,
    errorMessage: aiReviews.errorMessage,
    triggeredBy: aiReviews.triggeredBy,
    promptTokens: aiReviews.promptTokens,
    completionTokens: aiReviews.completionTokens,
    createdAt: aiReviews.createdAt,
  }).from(aiReviews)
    .leftJoin(aiEmployees, eq(aiReviews.aiEmployeeId, aiEmployees.id))
    .where(eq(aiReviews.contractId, contractId))
    .orderBy(desc(aiReviews.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const items = list.map((r: any) => ({
    ...r,
    result: r.result ? JSON.parse(r.result) : null,
  }))

  return { code: 0, data: items }
})
