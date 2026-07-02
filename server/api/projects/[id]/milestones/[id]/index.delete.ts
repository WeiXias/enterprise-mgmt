import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { milestones } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'milestone:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.update(milestones).set({ deletedAt: now }).where(eq(milestones.id, id))

  await logOperation(event, { action: 'DELETE', module: 'milestone', targetId: id, detail: '删除了里程碑' })

  return { code: 0, data: null, message: '里程碑已删除' }
})
