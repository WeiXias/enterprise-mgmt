import { defineEventHandler } from 'h3'
import { db } from '#database'
import { tags } from '#schema/customers'

export default defineEventHandler(async (event) => {
  const list = await db.select().from(tags).orderBy(tags.name)
  return { code: 0, data: list }
})
