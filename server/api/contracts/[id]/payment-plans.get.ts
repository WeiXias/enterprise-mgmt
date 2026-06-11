import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { paymentPlans } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const list = await db.select().from(paymentPlans).where(eq(paymentPlans.contractId, id))
  return { code: 0, data: list }
})
