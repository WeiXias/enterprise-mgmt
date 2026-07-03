import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { contracts } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { requireTransition } from '#server-utils/workflow'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:approve')
  const { id } = getRouterParams(event)
  const existing = await db.select({ id: contracts.id, status: contracts.status }).from(contracts)
    .where(and(eq(contracts.id, id), isNull(contracts.deletedAt))).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })

  const current = existing[0].status
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  if (current === 'draft') {
    // 草稿 → 已审批
    requireTransition('contracts', current, 'approved')
    await db.update(contracts).set({
      status: 'approved',
      approvedBy: user.userId,
      approvedAt: now,
      updatedAt: now,
    }).where(eq(contracts.id, id))
    await logOperation(event, { action: 'APPROVE', module: 'contract', targetId: id, detail: '审批通过了合同' })
    return { code: 0, data: null, message: '审批通过了！' }
  }

  if (current === 'approved') {
    // 已审批 → 执行中
    requireTransition('contracts', current, 'in_progress')
    await db.update(contracts).set({
      status: 'in_progress',
      updatedAt: now,
    }).where(eq(contracts.id, id))
    await logOperation(event, { action: 'START', module: 'contract', targetId: id, detail: '合同进入执行状态' })
    return { code: 0, data: null, message: '合同已进入执行状态！' }
  }

  // 其他状态不允许审批
  throw createError({ statusCode: 400, statusMessage: `当前状态「${current}」不支持审批操作` })
})
