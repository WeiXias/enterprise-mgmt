import { defineEventHandler } from 'h3'
import { db } from '#database'
import { backups } from '#schema/system'
import { desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async () => {
  const list = await db.select().from(backups).orderBy(desc(backups.createdAt))
  await requirePermission(event, 'system:backup')
  return { code: 0, data: list }
})
