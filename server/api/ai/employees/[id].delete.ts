import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { aiEmployees, aiReviews } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: aiEmployees.id, name: aiEmployees.name })
    .from(aiEmployees).where(eq(aiEmployees.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: 'AI 员工不存在' })

  // 检查是否有进行中的审核记录
  const refCount = await db.select({ count: aiReviews.id }).from(aiReviews)
    .where(eq(aiReviews.aiEmployeeId, id))
  const { count } = refCount[0] || { count: 0 }

  await db.delete(aiEmployees).where(eq(aiEmployees.id, id))

  await logOperation(event, { action: 'DELETE', module: 'ai_employee', targetId: id, detail: `删除了 AI 数字员工「${existing[0].name}」` })

  return { code: 0, data: { hasReviews: count > 0 }, message: 'AI 员工已删除' }
})
