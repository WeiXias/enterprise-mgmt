import { defineEventHandler } from 'h3'
import { db } from '#database'
import { products, dictEntries, contractProducts } from '#schema'
import { and, isNull, desc, sql, eq } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'product:view')
  if (!user?.userId) return { code: 0, data: { byCategory: [], byProduct: [] } }

  // 按分类统计
  const byCategory = await db.select({
    categoryId: dictEntries.id,
    categoryName: dictEntries.label,
    productCount: sql<number>`count(${products.id})`,
  }).from(dictEntries)
    .leftJoin(products, and(eq(products.categoryId, dictEntries.id), isNull(products.deletedAt)))
    .groupBy(dictEntries.id, dictEntries.label)
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
      byCategory: byCategory.map((r: any) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        productCount: Number(r.productCount || 0),
      })),
      byProduct: byProduct.map((r: any) => ({
        productId: r.productId,
        productName: r.productName,
        productCode: r.productCode,
        salesCount: Number(r.salesCount || 0),
        salesAmount: Number(r.salesAmount || 0),
      })),
    }
  }
})
