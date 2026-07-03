import { defineEventHandler } from 'h3'
import { db } from '#database'
import { financeSettings } from '#schema'
import { requirePermission } from '#server-utils/permission'

const DEFAULT_SETTINGS: Record<string, any> = {
  voucherPrefix: 'JZ',
  defaultCashAccountId: '',
  defaultReceivableAccountId: '1122',
  defaultPayableAccountId: '2202',
  defaultRevenueAccountId: '5001',
  defaultExpenseAccountId: '5601.01',
  requireApprovalFlow: true,
  enableTaxAccounting: false,
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'finance:view')
  const rows = await db.select().from(financeSettings)
  const result: Record<string, any> = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = row.value }
  }
  return { code: 0, data: result }
})
