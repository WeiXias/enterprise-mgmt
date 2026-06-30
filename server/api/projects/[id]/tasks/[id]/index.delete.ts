import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { tasks } from '#schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'project:delete')
  await db.delete(tasks).where(eq(tasks.id, id))
  return { code: 0, data: null, message: '任务已删除' }
})
