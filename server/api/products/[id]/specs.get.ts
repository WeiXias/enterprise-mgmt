import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { productSpecs } from '#schema/products'
import { eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'product:read')
  const list = await db.select().from(productSpecs).where(eq(productSpecs.productId, id)).orderBy(productSpecs.sort)
  return { code: 0, data: list }
})
