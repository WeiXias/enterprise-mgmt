import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { products, dictEntries } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'product:view')

  const result = await db.select({
    id: products.id,
    name: products.name,
    code: products.code,
    model: products.model,
    manufacturer: products.manufacturer,
    unit: products.unit,
    standardPrice: products.standardPrice,
    costPrice: products.costPrice,
    description: products.description,
    status: products.status,
    categoryId: products.categoryId,
    categoryName: dictEntries.label,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
    stockQuantity: products.stockQuantity,
  }).from(products)
    .leftJoin(dictEntries, eq(products.categoryId, dictEntries.id))
    .where(and(eq(products.id, id), isNull(products.deletedAt))).limit(1)

  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '产品不存在' })

  const p = result[0]
  return {
    code: 0,
    data: {
      ...p,
      category: p!.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
    }
  }
})
