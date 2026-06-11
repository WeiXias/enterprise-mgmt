import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { commissionPayouts, financeTransactions } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:manage')
  const { id } = getRouterParams(event)

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(commissionPayouts).set({ status: 'confirmed', paidAt: now }).where(eq(commissionPayouts.id, id))

  // Auto-generate expense transaction
  const [payout] = await db.select().from(commissionPayouts).where(eq(commissionPayouts.id, id))
  if (payout) {
    await db.insert(financeTransactions).values({
      id: generateId(),
      type: 'expense',
      amount: payout.totalAmount,
      category: 'commission_payout',
      sourceType: 'commission_payout',
      sourceId: id,
      transactionDate: now.slice(0, 10),
      description: `提成发放 - ${payout.periodMonth}`,
      createdBy: user.userId,
      createdAt: now,
    })
  }

  await logOperation(event, { action: 'APPROVE', module: 'payout', targetId: id, detail: '确认了提成发放' })
  return { code: 0, data: null, message: '提成已确认发放' }
})
