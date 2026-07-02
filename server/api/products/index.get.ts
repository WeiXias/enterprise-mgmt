import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { products, productCategories } from '#schema'
import { eq, and, isNull, like, or, sql, asc, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  await requirePermission(event, 'product:view')
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const categoryId = query.categoryId as string | undefined
  const status = query.status as string | undefined
  const sortBy = (query.sortBy as string) || 'updatedAt'
  const sortOrder = (query.sortOrder as string) || 'desc'

  const conditions = [isNull(products.deletedAt)]
  if (keyword) {
    conditions.push(or(
      like(products.name, `%${keyword}%`),
      like(products.code, `%${keyword}%`),
    ))
  }
  if (categoryId) conditions.push(eq(products.categoryId, categoryId))
  if (status) conditions.push(eq(products.status, status))

  const orderFn = sortOrder === 'asc' ? asc : desc
  const sortColumns: Record<string, any> = {
    name: products.name, code: products.code, status: products.status,
    standardPrice: products.standardPrice, stockQuantity: products.stockQuantity,
    createdAt: products.createdAt, updatedAt: products.updatedAt,
  }
  const orderColumn = sortColumns[sortBy] || products.updatedAt

  const [list, totalResult] = await Promise.all([
    db.select({
      id: products.id,
      name: products.name,
      code: products.code,
      model: products.model,
      manufacturer: products.manufacturer,
      unit: products.unit,
      type: products.type,
      standardPrice: products.standardPrice,
      costPrice: products.costPrice,
      stockQuantity: sql<number>`COALESCE(${products.stockQuantity}, 0)`,
      status: products.status,
      categoryId: products.categoryId,
      categoryName: productCategories.name,
      description: products.description,
      createdAt: products.createdAt,
    }).from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(products).where(and(...conditions)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((p: any) => ({
        ...p,
        stockQuantity: Number(p.stockQuantity) || 0,
        category: p.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
        categoryName: p.categoryName || null,
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
