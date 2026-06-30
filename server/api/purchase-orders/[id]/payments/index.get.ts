import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { purchasePayments } from '#schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id: orderId } = getRouterParams(event)
  await requirePermission(event, 'purchase-order:read')

  const list = await db.select().from(purchasePayments)
    .where(and(eq(purchasePayments.orderId, orderId), isNull(purchasePayments.deletedAt)))
    .orderBy(desc(purchasePayments.createdAt))

  return { code: 0, data: list }
})
