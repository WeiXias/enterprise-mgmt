import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { purchasePayables } from '#schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id: orderId } = getRouterParams(event)
  await requirePermission(event, 'purchase-order:read')

  const [payable] = await db.select().from(purchasePayables)
    .where(and(eq(purchasePayables.orderId, orderId), isNull(purchasePayables.deletedAt)))
    .limit(1)

  return { code: 0, data: payable || null }
})
