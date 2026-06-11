import { defineEventHandler } from 'h3'
import { db } from '#database'
import { productCategories } from '#schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const rows = await db.select({
    id: productCategories.id,
    name: productCategories.name,
    sort: productCategories.sort,
    createdAt: productCategories.createdAt,
  }).from(productCategories)
    .orderBy(asc(productCategories.sort), asc(productCategories.name))

  return { code: 0, data: rows }
})
