import { defineEventHandler } from 'h3'
import { db } from '#database'
import { products, productCategories, contractProducts } from '#schema'
import { and, isNull, desc, sql, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user?.userId) return { code: 0, data: { byCategory: [], byProduct: [] } }

  // 按分类统计
  const byCategory = await db.select({
    categoryId: productCategories.id,
    categoryName: productCategories.name,
    productCount: sql<number>`count(${products.id})`,
  }).from(productCategories)
    .leftJoin(products, and(eq(products.categoryId, productCategories.id), isNull(products.deletedAt)))
    .groupBy(productCategories.id, productCategories.name)
    .orderBy(desc(sql`count(${products.id})`))

  // 热销产品 Top 20
  const byProduct = await db.select({
    productId: products.id,
    productName: products.name,
    productCode: products.code,
    salesCount: sql<number>`coalesce(sum(${contractProducts.quantity}), 0)`,
    salesAmount: sql<number>`coalesce(sum(${contractProducts.quantity} * ${contractProducts.unitPrice} * ${contractProducts.discount}), 0)`,
  }).from(products)
    .leftJoin(contractProducts, eq(contractProducts.productId, products.id))
    .where(isNull(products.deletedAt))
    .groupBy(products.id, products.name, products.code)
    .orderBy(desc(sql`coalesce(sum(${contractProducts.quantity} * ${contractProducts.unitPrice} * ${contractProducts.discount}), 0)`))
    .limit(20)

  return {
    code: 0,
    data: {
      byCategory: byCategory.map(r => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        productCount: Number(r.productCount || 0),
      })),
      byProduct: byProduct.map(r => ({
        productId: r.productId,
        productName: r.productName,
        productCode: r.productCode,
        salesCount: Number(r.salesCount || 0),
        salesAmount: Number(r.salesAmount || 0),
      })),
    }
  }
})
