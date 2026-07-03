import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { reimbursements } from '#schema'
import { eq } from 'drizzle-orm'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { requireTransition } from '#server-utils/workflow'
import { createAutoVoucher, getOrCreatePeriod } from '#server-utils/accounting/posting'
import { z } from 'zod'

const schema = z.object({ paymentMethod: z.string().optional() })

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const existing = await db.select().from(reimbursements).where(eq(reimbursements.id, id)).limit(1)
  if (existing.length === 0) throw createError({ statusCode: 404, statusMessage: '报销单不存在' })
  requireTransition('reimbursements', existing[0].status, 'paid')

  const r = existing[0]
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 报销类型 → 科目映射
  const expenseAccountMap: Record<string, string> = {
    '办公用品': '5601.01',
    '差旅费': '5601.05',
    '招待费': '5601.06',
    '其他': '5601.01',
  }
  const accountCode = expenseAccountMap[r.type] || '5601.01'

  await db.transaction(async (tx) => {
    // 自动生成会计凭证：借:管理费用-XX 贷:银行存款
    const period = await getOrCreatePeriod(tx as any, now.slice(0, 10))
    const { voucherId } = await createAutoVoucher(tx as any, {
      voucherDate: now.slice(0, 10),
      summary: `报销打款 - ${r.reason}`,
      sourceType: 'reimbursement',
      sourceId: id,
      periodId: period.id,
      entries: [
        { accountCode, summary: `报销-${r.type}`, debitAmount: r.amount, creditAmount: 0 },
        { accountCode: '1002', summary: '银行存款', debitAmount: 0, creditAmount: r.amount },
      ],
    }, user.userId)

    // 标记为已打款，关联凭证ID
    await tx.update(reimbursements).set({
      status: 'paid',
      paidAt: now,
      paidTransactionId: voucherId,
    }).where(eq(reimbursements.id, id))
  })

  await logOperation(event, { action: 'PAY', module: 'reimbursement', targetId: id, detail: '支付了报销款' })
  return { code: 0, data: null, message: '打款完成，已生成会计凭证' }
})
