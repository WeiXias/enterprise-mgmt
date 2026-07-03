import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { payments } from '#schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'contract:view')
  const list = await db.select().from(payments)
    .where(and(eq(payments.contractId, id), isNull(payments.deletedAt)))
    .orderBy(desc(payments.paymentDate))
  return { code: 0, data: list }
})
