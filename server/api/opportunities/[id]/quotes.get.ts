import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { quotes, quoteProducts, products } from '#schema'
import { eq, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id: oppId } = getRouterParams(event)
  await requirePermission(event, 'quote:view')

  const quoteList = await db.select({
    id: quotes.id,
    name: quotes.name,
    totalAmount: quotes.totalAmount,
    status: quotes.status,
    validUntil: quotes.validUntil,
    remark: quotes.remark,
    createdAt: quotes.createdAt,
  }).from(quotes).where(eq(quotes.opportunityId, oppId)).orderBy(desc(quotes.createdAt))

  return { code: 0, data: quoteList }
})
