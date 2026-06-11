import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { subcontractParties } from '#schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const list = await db.select().from(subcontractParties).orderBy(desc(subcontractParties.createdAt))
  return { code: 0, data: list }
})
