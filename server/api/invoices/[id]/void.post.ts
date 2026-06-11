import { defineEventHandler, getRouterParams, createError } from 'h3'
import { db } from '#database'
import { invoices } from '#schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const [record] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  if (!record) throw createError({ statusCode: 404, statusMessage: '发票不存在' })

  await db.update(invoices).set({ status: 'voided' }).where(eq(invoices.id, id))
  return { code: 0, message: '发票已作废' }
})
