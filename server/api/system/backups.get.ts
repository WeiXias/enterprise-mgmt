import { defineEventHandler } from 'h3'
import { db } from '#database'
import { backups } from '#schema/system'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const list = await db.select().from(backups).orderBy(desc(backups.createdAt))
  return { code: 0, data: list }
})
