import { defineEventHandler, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders, aiEmployees } from '#schema/ai'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: aiProviders.id, name: aiProviders.name }).from(aiProviders)
    .where(eq(aiProviders.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '供应商不存在' })

  // 检查是否有 AI 员工引用此供应商
  const refCount = await db.select({ count: aiEmployees.id }).from(aiEmployees)
    .where(eq(aiEmployees.providerId, id))
  if (refCount.length > 0) {
    throw createError({ statusCode: 400, statusMessage: '有 AI 员工正在使用此供应商，请先删除关联的 AI 员工' })
  }

  await db.delete(aiProviders).where(eq(aiProviders.id, id))

  await logOperation(event, { action: 'DELETE', module: 'ai_employee', targetId: id, detail: `删除了模型供应商「${existing[0].name}」` })

  return { code: 0, data: null, message: '供应商已删除' }
})
