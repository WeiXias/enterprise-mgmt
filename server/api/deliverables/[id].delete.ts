import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'deliverable:delete')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)

  await db.delete(deliverables).where(eq(deliverables.id, id))

  await logOperation(event, { action: 'DELETE', module: 'deliverable', targetId: id, detail: '删除了交付物' })

  return { code: 0, data: null, message: '交付物已删除' }
})
