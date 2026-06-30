import { defineEventHandler } from 'h3'
import { db } from '#database'
import { financeSettings } from '#schema'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:read')
  const rows = await db.select().from(financeSettings)
  const result: Record<string, any> = {}
  for (const row of rows) {
    // Try to parse JSON values
    try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = row.value }
  }
  return { code: 0, data: result }
})
