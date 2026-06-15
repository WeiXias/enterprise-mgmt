import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { productImages } from '#schema/products'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const list = await db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(productImages.sort)
  return { code: 0, data: list }
})
