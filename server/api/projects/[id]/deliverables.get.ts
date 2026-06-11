import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { deliverables } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: projectId } = getRouterParams(event)
  const list = await db.select().from(deliverables).where(eq(deliverables.projectId, projectId))
  return { code: 0, data: list }
})
