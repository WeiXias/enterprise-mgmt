import { defineEventHandler, getRouterParams } from 'h3'
import { db } from '#database'
import { commissionPayouts } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { createAutoVoucher, getOrCreatePeriod } from '#server-utils/accounting/posting'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'commission:manage')
  const { id } = getRouterParams(event)

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await db.update(commissionPayouts).set({ status: 'confirmed', paidAt: now }).where(eq(commissionPayouts.id, id))

  // 自动生成会计凭证：借:销售费用-提成 贷:银行存款
  const [payout] = await db.select().from(commissionPayouts).where(eq(commissionPayouts.id, id))
  if (payout) {
    const period = await getOrCreatePeriod(db, now.slice(0, 10))
    await createAutoVoucher(db, {
      voucherDate: now.slice(0, 10),
      summary: `提成发放 - ${payout.periodMonth}`,
      sourceType: 'commission_payout',
      sourceId: id,
      periodId: period.id,
      entries: [
        { accountCode: '5501.01', summary: '销售费用-提成', debitAmount: payout.totalAmount, creditAmount: 0 },
        { accountCode: '1002', summary: '银行存款', debitAmount: 0, creditAmount: payout.totalAmount },
      ],
    }, user.userId)
  }

  await logOperation(event, { action: 'APPROVE', module: 'payout', targetId: id, detail: '确认了提成发放' })
  return { code: 0, data: null, message: '提成已确认发放' }
})
