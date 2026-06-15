import { defineEventHandler, getRouterParams, createError } from 'h3'
import { requirePermission } from '#server-utils/permission'
import { db } from '#database'
import { aiProviders, aiEmployees } from '#schema/ai'
import { eq, and, isNull } from 'drizzle-orm'
import dayjs from 'dayjs'
import { logOperation } from '#server-utils/log'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ai:manage')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: aiProviders.id, name: aiProviders.name }).from(aiProviders)
    .where(and(eq(aiProviders.id, id), isNull(aiProviders.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '供应商不存在' })

  // 检查是否有未删除的员工引用此供应商
  const refCount = await db.select({ count: aiEmployees.id }).from(aiEmployees)
    .where(and(eq(aiEmployees.providerId, id), isNull(aiEmployees.deletedAt)))
  if (refCount.length > 0) {
    throw createError({ statusCode: 400, statusMessage: '有数字员工正在使用此供应商，请先删除关联的员工' })
  }

  const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
  await db.update(aiProviders).set({ deletedAt: now }).where(eq(aiProviders.id, id))
  await logOperation(event, { action: 'DELETE', module: 'ai_provider', targetId: id, detail: `删除了模型供应商「${existing[0].name}」` })

  return { code: 0, data: null, message: '供应商已删除' }
})
