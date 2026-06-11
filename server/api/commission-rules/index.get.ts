import { defineEventHandler } from 'h3'
import { db } from '#database'
import { commissionRules } from '#schema'

export default defineEventHandler(async () => {
  const list = await db.select().from(commissionRules)
  return { code: 0, data: list }
})
