import { defineEventHandler, getRouterParams, readBody, createError } from 'h3'
import { db } from '#database'
import { contracts, payments, paymentPlans } from '#schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { createAutoVoucher, getOrCreatePeriod, calcTax, isTaxEnabled, getCashAccountCode, getReceivableCode } from '#server-utils/accounting/posting'

const schema = z.object({
  paymentPlanId: z.string().optional(),
  amount: z.number().min(0),
  paymentDate: z.string(),
  paymentMethod: z.string().optional(),
  remark: z.string().optional(),
  attachmentPath: z.string().optional(),
  taxRate: z.number().min(0).optional(),
})

export default defineEventHandler(async (event) => {
  const user = event.context.user
  await requirePermission(event, 'payment:create')
  if (!user?.userId) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  const { id: contractId } = getRouterParams(event)
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const taxRate = parsed.data.taxRate ?? 0
  const paymentId = generateId()

  await db.insert(payments).values({
    id: paymentId,
    contractId,
    paymentPlanId: parsed.data.paymentPlanId || null,
    amount: parsed.data.amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethod: parsed.data.paymentMethod || null,
    remark: parsed.data.remark || null,
    attachmentPath: parsed.data.attachmentPath || null,
    createdBy: user.userId,
    createdAt: now,
    taxRate: Math.round(taxRate * 10000), // 存万分比，如 13% → 1300
  } as any)

  // If linked to a plan, mark it as paid
  if (parsed.data.paymentPlanId) {
    await db.update(paymentPlans)
      .set({ status: 'paid' })
      .where(eq(paymentPlans.id, parsed.data.paymentPlanId))
  }

  // 自动生成会计凭证
  const period = await getOrCreatePeriod(db, parsed.data.paymentDate)
  const taxEnabled = await isTaxEnabled(db)
  const effectiveTaxRate = taxEnabled ? taxRate : 0
  const { netAmount, taxAmount } = calcTax(parsed.data.amount, effectiveTaxRate)
  const cashCode = await getCashAccountCode(db)
  const receivableCode = await getReceivableCode(db)

  const voucherEntries: Array<{ accountCode: string; summary: string; debitAmount: number; creditAmount: number; contractId?: string | null }> = [
    { accountCode: cashCode, summary: '银行存款', debitAmount: parsed.data.amount, creditAmount: 0 },
    { accountCode: receivableCode, summary: '应收账款', debitAmount: 0, creditAmount: netAmount, contractId },
  ]

  // 启用增值税核算且有税率时，加入销项税额分录
  if (taxEnabled && taxRate > 0) {
    voucherEntries.push({ accountCode: '2221.01', summary: '应交税费-增值税(销项税额)', debitAmount: 0, creditAmount: taxAmount })
  }

  await createAutoVoucher(db, {
    voucherDate: parsed.data.paymentDate,
    summary: `合同收款${parsed.data.remark ? ' - ' + parsed.data.remark : ''}${taxEnabled && taxRate > 0 ? ` (含税${(taxRate * 100).toFixed(0)}%)` : ''}`,
    sourceType: 'contract_payment',
    sourceId: paymentId,
    periodId: period.id,
    entries: voucherEntries,
  }, user.userId)

  await logOperation(event, { action: 'CREATE', module: 'payment', targetId: paymentId, detail: '记录了收款' })

  return { code: 0, data: null, message: '收款已登记' }
})
