import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { aiEmployees, aiProviders } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'ai:read')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const rows = await db.select({
    id: aiEmployees.id,
    name: aiEmployees.name,
    role: aiEmployees.role,
    roleLabel: aiEmployees.roleLabel,
    providerId: aiEmployees.providerId,
    providerName: aiProviders.name,
    model: aiEmployees.model,
    systemPrompt: aiEmployees.systemPrompt,
    temperature: aiEmployees.temperature,
    maxTokens: aiEmployees.maxTokens,
    isActive: aiEmployees.isActive,
    createdBy: aiEmployees.createdBy,
    createdAt: aiEmployees.createdAt,
    updatedAt: aiEmployees.updatedAt,
  }).from(aiEmployees)
    .leftJoin(aiProviders, eq(aiEmployees.providerId, aiProviders.id))
    .where(eq(aiEmployees.id, id))
    .limit(1)

  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: 'AI 员工不存在' })

  return { code: 0, data: rows[0] }
})
