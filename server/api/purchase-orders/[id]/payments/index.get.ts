import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { purchasePayments } from '#schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id: orderId } = getRouterParams(event)

  const list = await db.select().from(purchasePayments)
    .where(and(eq(purchasePayments.orderId, orderId), isNull(purchasePayments.deletedAt)))
    .orderBy(desc(purchasePayments.createdAt))

  return { code: 0, data: list }
})
