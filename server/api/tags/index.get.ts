import { defineEventHandler } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const list = await db.select().from(dictEntries)
    .where(eq(dictEntries.dict_type, 'customer_tag'))
    .orderBy(asc(dictEntries.sort), asc(dictEntries.label))

  return { code: 0, data: list.map(r => ({ id: r.id, name: r.label, color: '', createdAt: r.createdAt })) }
})
