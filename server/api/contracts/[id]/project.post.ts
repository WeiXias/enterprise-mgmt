import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts, projects, projectMembers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'project:create')
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: contractId } = getRouterParams(event)
  const contract = await db.select().from(contracts).where(and(eq(contracts.id, contractId), isNull(contracts.deletedAt))).limit(1)
  if (contract.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })
  const c = contract[0]
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const projectId = generateId()
  await db.insert(projects).values({
    id: projectId, name: c!.name + ' 项目', contractId,
    ownerUserId: user.userId, status: 'not_started',
    startDate: c!.startDate, endDate: c.endDate,
    createdAt: now, updatedAt: now,
  })
  await db.insert(projectMembers).values({ id: generateId(), projectId, userId: user.userId, role: 'leader', createdAt: now })
  return { code: 0, data: { id: projectId }, message: '项目已创建' }
})
