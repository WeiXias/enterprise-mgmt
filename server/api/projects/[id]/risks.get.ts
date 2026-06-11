import { defineEventHandler, getRouterParams, getQuery } from 'h3'
import { db } from '#database'
import { risks } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const query = getQuery(event)
  const where: any[] = [eq(risks.projectId, projectId), isNull(risks.deletedAt)]
  if (query.type) where.push(eq(risks.type, query.type as string))
  if (query.status) where.push(eq(risks.status, query.status as string))

  const list = await db.select().from(risks).where(and(...where)).orderBy(risks.createdAt)
  return { code: 0, data: list }
})
