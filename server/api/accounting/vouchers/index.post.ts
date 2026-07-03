import { defineEventHandler, readBody, createError } from 'h3'
import { db } from '#database'
import { vouchers, voucherEntries, accountingPeriods } from '#schema'
import { eq } from 'drizzle-orm'
import { generateId } from '#server-utils/id'
import { logOperation } from '#server-utils/log'
import { requirePermission } from '#server-utils/permission'
import { z } from 'zod'

const entrySchema = z.object({
  accountId: z.string().min(1),
  summary: z.string().optional(),
  debitAmount: z.number().int().default(0),
  creditAmount: z.number().int().default(0),
  contractId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
})

const schema = z.object({
  voucherDate: z.string().min(1),
  summary: z.string().optional(),
  periodId: z.string().min(1),
  entries: z.array(entrySchema).min(2),
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'finance:manage')
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: parsed.error.issues.map(i => i.message).join('; ') })

  const { voucherDate, summary, periodId, entries } = parsed.data
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 校验借贷平衡
  let totalDebit = 0, totalCredit = 0
  for (const e of entries) { totalDebit += e.debitAmount; totalCredit += e.creditAmount }
  if (totalDebit !== totalCredit || totalDebit === 0) {
    throw createError({ statusCode: 422, statusMessage: `借贷不平衡：借方 ${totalDebit}，贷方 ${totalCredit}` })
  }

  // 验证科目存在
  const { accounts } = await import('#schema/accounting')
  for (const e of entries) {
    const acc = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, e.accountId)).limit(1)
    if (acc.length === 0) throw createError({ statusCode: 422, statusMessage: `科目 ${e.accountId} 不存在` })
  }

  // 验证会计期间存在
  const period = await db.select({ id: accountingPeriods.id, isClosed: accountingPeriods.isClosed })
    .from(accountingPeriods).where(eq(accountingPeriods.id, periodId)).limit(1)
  if (period.length === 0) throw createError({ statusCode: 422, statusMessage: '会计期间不存在' })
  if (period[0].isClosed === 1) throw createError({ statusCode: 422, statusMessage: '该会计期间已结账' })

  // 生成凭证号
  const dateStr = voucherDate.slice(0, 7).replace('-', '-')
  const countResult = await db.run(
    `select count(*) as cnt from vouchers where voucher_no like 'JZ-${dateStr}-%'`
  )
  // Use a simple approach to get the sequence number
  const allVouchers = await db.select({ voucherNo: vouchers.voucherNo }).from(vouchers)
  const thisMonth = allVouchers.filter((v: any) => v.voucherNo.startsWith(`JZ-${dateStr}-`))
  const seq = String(thisMonth.length + 1).padStart(4, '0')
  const voucherNo = `JZ-${dateStr}-${seq}`

  const voucherId = generateId()
  await db.insert(vouchers).values({
    id: voucherId,
    voucherNo,
    voucherDate,
    summary: summary || null,
    status: 'draft',
    periodId,
    preparedBy: user.userId,
    createdAt: now,
    updatedAt: now,
  } as any)

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    await db.insert(voucherEntries).values({
      id: generateId(),
      voucherId,
      accountId: e.accountId,
      summary: e.summary || summary || null,
      debitAmount: e.debitAmount,
      creditAmount: e.creditAmount,
      contractId: e.contractId || null,
      projectId: e.projectId || null,
      customerId: e.customerId || null,
      supplierId: e.supplierId || null,
      sort: i,
      createdAt: now,
    } as any)
  }

  await logOperation(event, { action: 'CREATE', module: 'accounting', targetId: voucherId, detail: `创建凭证 ${voucherNo}` })
  return { code: 0, data: { id: voucherId, voucherNo }, message: '凭证已创建' }
})
