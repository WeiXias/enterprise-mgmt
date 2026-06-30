import { defineEventHandler } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'
import { isNull, asc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const list = await db.select({
  await requirePermission(event, 'tag:read')
    id: tags.id,
    name: tags.name,
    color: tags.color,
    createdAt: tags.createdAt,
  }).from(tags)
    .where(isNull(tags.deletedAt))
    .orderBy(asc(tags.createdAt))

  return { code: 0, data: list }
})
