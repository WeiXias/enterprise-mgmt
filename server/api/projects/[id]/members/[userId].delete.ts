import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { projectMembers } from '#schema'
import { eq, and } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id, userId } = getRouterParams(event)
  await requirePermission(event, 'project:delete')
  await db.delete(projectMembers).where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)))
  await logOperation(event, { action: 'DELETE', module: 'project', targetId: id, detail: '移除了项目成员' })
  return { code: 0, data: null, message: '成员已移除' }
})
