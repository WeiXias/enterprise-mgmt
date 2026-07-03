import { defineEventHandler } from 'h3'
import { db } from '#database'
import { accountingPeriods } from '#schema'
import { desc } from 'drizzle-orm'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const rows = await db.select().from(accountingPeriods).orderBy(desc(accountingPeriods.year), desc(accountingPeriods.month))
  return { code: 0, data: rows }
})
