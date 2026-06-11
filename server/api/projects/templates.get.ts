import { defineEventHandler } from 'h3'
import { db } from '#database'
import { projectTemplates } from '#schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const items = await db.select().from(projectTemplates).where(isNull(projectTemplates.deletedAt))
  return { code: 0, data: items }
})
