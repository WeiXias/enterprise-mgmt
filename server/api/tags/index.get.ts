import { defineEventHandler } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { isNull, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const list = await db.select({
    id: tags.id,
    name: tags.name,
    color: tags.color,
    createdAt: tags.createdAt,
  }).from(tags)
    .where(isNull(tags.deletedAt))
    .orderBy(asc(tags.createdAt))

  return { code: 0, data: list }
})
