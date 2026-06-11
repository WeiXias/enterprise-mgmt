import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { milestones } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const list = await db.select().from(milestones)
    .where(and(eq(milestones.projectId, projectId), isNull(milestones.deletedAt)))
    .orderBy(milestones.sortOrder)
  return { code: 0, data: list }
})
