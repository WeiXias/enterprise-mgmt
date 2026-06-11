import { defineEventHandler, getQuery } from 'h3'
import { db } from '#database'
import { products, productCategories } from '#schema/products'
import { eq, and, isNull, like, or, sql, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)
  const keyword = query.keyword as string | undefined
  const categoryId = query.categoryId as string | undefined
  const status = query.status as string | undefined

  const conditions = [isNull(products.deletedAt)]
  if (keyword) {
    conditions.push(or(
      like(products.name, `%${keyword}%`),
      like(products.code, `%${keyword}%`),
    ))
  }
  if (categoryId) conditions.push(eq(products.categoryId, categoryId))
  if (status) conditions.push(eq(products.status, status))

  const [list, totalResult] = await Promise.all([
    db.select({
      id: products.id,
      name: products.name,
      code: products.code,
      standardPrice: products.standardPrice,
      costPrice: products.costPrice,
      stockQuantity: products.stockQuantity,
      status: products.status,
      categoryId: products.categoryId,
      categoryName: productCategories.name,
      description: products.description,
      createdAt: products.createdAt,
    }).from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(...conditions))
      .orderBy(desc(products.updatedAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)` }).from(products).where(and(...conditions)),
  ])

  const total = Number(totalResult[0]?.count || 0)
  return {
    code: 0,
    data: {
      items: list.map((p) => ({
        ...p,
        category: p.categoryId ? { id: p.categoryId, name: p.categoryName } : null,
      })),
      total, page, pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
