import { defineEventHandler } from 'h3'
import { db } from '#database'
import { aiEmployees, aiProviders } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { checkPermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const hasManage = await checkPermission(event, 'ai:manage')
  await requirePermission(event, 'ai:view')

  const list = await db.select({
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
    createdAt: aiEmployees.createdAt,
    updatedAt: aiEmployees.updatedAt,
  }).from(aiEmployees)
    .leftJoin(aiProviders, eq(aiEmployees.providerId, aiProviders.id))
    .orderBy(() => aiEmployees.createdAt)

  // 有管理权限看全部，其他人只看活跃的
  const items = hasManage
    ? list
    : list.filter((e: { isActive: boolean }) => e.isActive)

  return { code: 0, data: items }
})
