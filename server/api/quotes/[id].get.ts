import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts, products } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const result = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1)
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: '报价不存在' })
  const q = result[0]

  const items = await db.select({
    productId: quoteProducts.productId,
    productName: products.name,
    quantity: quoteProducts.quantity,
    unitPrice: quoteProducts.unitPrice,
    discount: quoteProducts.discount,
  }).from(quoteProducts)
    .leftJoin(products, eq(quoteProducts.productId, products.id))
    .where(eq(quoteProducts.quoteId, id))

  return {
    code: 0,
    data: {
      id: q.id,
      name: q.name,
      totalAmount: q.totalAmount,
      finalAmount: q.totalAmount,
      validUntil: q.validUntil,
      status: q.status,
      pdfUrl: q.pdfPath || null,
      items,
      createdAt: q.createdAt,
    },
  }
})
