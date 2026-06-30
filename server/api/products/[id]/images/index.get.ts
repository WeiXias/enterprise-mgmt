import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { productImages } from '#schema/products'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'product:view')
  const list = await db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(productImages.sort)
  return { code: 0, data: list }
})
