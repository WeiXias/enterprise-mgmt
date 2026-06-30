import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { purchaseInvoices } from '#schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id: orderId } = getRouterParams(event)
  await requirePermission(event, 'purchase-order:view')

  const list = await db.select().from(purchaseInvoices)
    .where(and(eq(purchaseInvoices.orderId, orderId), isNull(purchaseInvoices.deletedAt)))
    .orderBy(desc(purchaseInvoices.createdAt))

  return { code: 0, data: list }
})
