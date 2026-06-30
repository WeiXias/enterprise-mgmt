import { defineEventHandler } from 'h3'
import { db } from '#database'
import { backups } from '#schema/system'
import { desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'system:backup')
  const list = await db.select().from(backups).orderBy(desc(backups.createdAt))
  return { code: 0, data: list }
})
