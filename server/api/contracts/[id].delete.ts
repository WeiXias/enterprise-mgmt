import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission, checkPermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:delete')

  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contracts.id, status: contracts.status }).from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })
  const canManage = await checkPermission(event, 'contract:manage')
  if (existing[0].status !== 'draft' && !canManage) throw createError({ statusCode: 400, statusMessage: '只有草稿状态才能删除' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(contracts).set({ deletedAt: now, updatedAt: now }).where(eq(contracts.id, id))

  await logOperation(event, { action: 'DELETE', module: 'contract', targetId: id, detail: '删除了合同' })

  return { code: 0, data: null, message: '合同已删除' }
})
