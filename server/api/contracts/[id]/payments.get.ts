import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { payments } from '#schema'
import { eq, desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  await requirePermission(event, 'contract:view')
  const list = await db.select().from(payments).where(eq(payments.contractId, id)).orderBy(desc(payments.paymentDate))
  return { code: 0, data: list }
})
