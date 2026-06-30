import { defineEventHandler } from 'h3'
import { db } from '#database'
import { projectTemplates } from '#schema'
import { isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'project:read')
  const items = await db.select().from(projectTemplates).where(isNull(projectTemplates.deletedAt))
  return { code: 0, data: items }
})
