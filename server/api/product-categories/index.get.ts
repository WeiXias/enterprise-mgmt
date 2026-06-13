import { defineEventHandler } from 'h3'
import { db } from '#database'
import { dictEntries } from '#schema'
import { eq, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const rows = await db.select({
    id: dictEntries.id,
    name: dictEntries.label,
    sort: dictEntries.sort,
    createdAt: dictEntries.createdAt,
  }).from(dictEntries)
    .where(eq(dictEntries.dict_type, 'product_category'))
    .orderBy(asc(dictEntries.sort), asc(dictEntries.label))

  return { code: 0, data: rows.map(r => ({ id: r.id, name: r.name, sort: r.sort, createdAt: r.createdAt })) }
})
