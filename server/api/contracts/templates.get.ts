import { defineEventHandler } from 'h3'
import { db } from '#database'
import { contractTemplates } from '#schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const items = await db.select().from(contractTemplates)
    .where(isNull(contractTemplates.deletedAt))
    .orderBy(contractTemplates.sortOrder)
  return { code: 0, data: items }
})
