import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contracts, projects, projectMembers } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { generateId } from '#server-utils/id'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: contractId } = getRouterParams(event)
  const contract = await db.select().from(contracts).where(and(eq(contracts.id, contractId), isNull(contracts.deletedAt))).limit(1)
  if (contract.length === 0) throw createError({ statusCode: 404, statusMessage: '合同不存在' })
  const c = contract[0]
  const now = new Date()
  const projectId = generateId()
  await db.insert(projects).values({
    id: projectId, name: c!.name + ' 项目', contractId,
    ownerId: user.userId, status: 'not_started', progress: 0,
    startDate: c!.startDate, endDate: c.endDate,
    createdAt: now, updatedAt: now,
  })
  await db.insert(projectMembers).values({ id: generateId(), projectId, userId: user.userId, role: 'owner', createdAt: now })
  return { code: 0, data: { id: projectId }, message: '项目已创建' }
})
