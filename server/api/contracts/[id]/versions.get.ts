import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { contractContentVersions, users } from '#schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })

  const { id } = getRouterParams(event)
  const list = await db.select({
    id: contractContentVersions.id,
    version: contractContentVersions.version,
    createdBy: contractContentVersions.createdBy,
    creatorName: users.name,
    createdAt: contractContentVersions.createdAt,
  }).from(contractContentVersions)
    .leftJoin(users, eq(contractContentVersions.createdBy, users.id))
    .where(eq(contractContentVersions.contractId, id))
    .orderBy(desc(contractContentVersions.version))

  return { code: 0, data: list }
})
