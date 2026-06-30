import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'contract:view')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contractTemplates.id, name: contractTemplates.name }).from(contractTemplates)
    .where(and(eq(contractTemplates.id, id), isNull(contractTemplates.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '模板不存在' })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(contractTemplates).set({ deletedAt: now, updatedAt: now }).where(eq(contractTemplates.id, id))

  await logOperation(event, { action: 'DELETE', module: 'contract_template', targetId: id, detail: `删除了合同模板「${existing[0].name}」` })

  return { code: 0, data: null, message: '模板已删除' }
})
