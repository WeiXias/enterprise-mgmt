import { generateId } from '../id'
import { accounts, vouchers, voucherEntries, accountBalances, accountingPeriods } from '../../database/schema/accounting'
import { eq, and, sql } from 'drizzle-orm'

// 直接从 finance schema 读取设置
async function loadSettings(db: any, key: string): Promise<string | null> {
  try {
    const { financeSettings: fs } = await import('../../database/schema/finance')
    const rows = await db.select({ value: fs.value }).from(fs).where(eq(fs.key, key)).limit(1)
    if (rows.length > 0) {
      try { return JSON.parse(rows[0].value) } catch { return rows[0].value }
    }
  } catch (_) { /* schema import may fail in some contexts */ }
  return null
}

const DEFAULT_CASH_ACCOUNT_CODE = '1002'
const DEFAULT_RECEIVABLE_CODE = '1122'
const DEFAULT_PAYABLE_CODE = '2202'
const DEFAULT_REVENUE_CODE = '5001'
const DEFAULT_EXPENSE_CODE = '5601.01'

export async function getCashAccountCode(db: any): Promise<string> {
  const code = await loadSettings(db, 'defaultCashAccountId')
  return code || DEFAULT_CASH_ACCOUNT_CODE
}

export async function getReceivableCode(db: any): Promise<string> {
  const code = await loadSettings(db, 'defaultReceivableAccountId')
  return code || DEFAULT_RECEIVABLE_CODE
}

export async function getPayableCode(db: any): Promise<string> {
  const code = await loadSettings(db, 'defaultPayableAccountId')
  return code || DEFAULT_PAYABLE_CODE
}

export async function getRevenueCode(db: any): Promise<string> {
  const code = await loadSettings(db, 'defaultRevenueAccountId')
  return code || DEFAULT_REVENUE_CODE
}

export async function getExpenseCode(db: any): Promise<string> {
  const code = await loadSettings(db, 'defaultExpenseAccountId')
  return code || DEFAULT_EXPENSE_CODE
}

export async function isApprovalRequired(db: any): Promise<boolean> {
  const val = await loadSettings(db, 'requireApprovalFlow')
  return val !== 'false'
}

export async function isTaxEnabled(db: any): Promise<boolean> {
  const val = await loadSettings(db, 'enableTaxAccounting')
  return val === 'true'
}

/**
 * 根据含税金额和税率计算不含税金额和税额
 * 中国增值税是价外税：含税金额 = 不含税金额 × (1 + 税率)
 * 返回 { netAmount, taxAmount }
 */
export function calcTax(grossAmount: number, taxRate: number): { netAmount: number; taxAmount: number } {
  if (taxRate <= 0) return { netAmount: grossAmount, taxAmount: 0 }
  const netAmount = Math.round(grossAmount / (1 + taxRate))
  const taxAmount = grossAmount - netAmount
  return { netAmount, taxAmount }
}

export interface VoucherEntryInput {
  accountCode: string
  summary?: string
  debitAmount?: number
  creditAmount?: number
  contractId?: string | null
  projectId?: string | null
  customerId?: string | null
  supplierId?: string | null
}

export interface CreateAutoVoucherInput {
  voucherDate: string
  summary: string
  sourceType: string
  sourceId?: string | null
  periodId: string
  entries: VoucherEntryInput[]
}

export async function createAutoVoucher(
  db: any,
  input: CreateAutoVoucherInput,
  userId: string,
): Promise<{ voucherId: string }> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  // 查找科目编码对应的科目ID
  const accountCodeMap = new Map<string, string>()
  const allCodes = [...new Set(input.entries.map(e => e.accountCode))]
  for (const code of allCodes) {
    const result = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, code)).limit(1)
    if (result.length === 0) throw new Error(`科目编码 ${code} 不存在`)
    accountCodeMap.set(code, result[0].id)
  }

  // 校验借贷平衡
  let totalDebit = 0, totalCredit = 0
  for (const e of input.entries) { totalDebit += e.debitAmount || 0; totalCredit += e.creditAmount || 0 }
  if (totalDebit !== totalCredit || totalDebit === 0) {
    throw new Error(`借贷不平衡：借方 ${totalDebit}，贷方 ${totalCredit}`)
  }

  // 检查是否需要审核流程
  const requireApproval = await isApprovalRequired(db)
  const voucherStatus = requireApproval ? 'approved' : 'posted'
  const postedAt = requireApproval ? null : now

  // 生成凭证号
  const prefix = (await loadSettings(db, 'voucherPrefix')) || 'JZ'
  const dateStr = input.voucherDate.slice(0, 7).replace('-', '-')
  const allVouchers = await db.select({ voucherNo: vouchers.voucherNo }).from(vouchers)
  const thisMonth = allVouchers.filter((v: any) => v.voucherNo.startsWith(`${prefix}-${dateStr}-`))
  const seq = String(thisMonth.length + 1).padStart(4, '0')
  const voucherNo = `${prefix}-${dateStr}-${seq}`

  const voucherId = generateId()

  await db.insert(vouchers).values({
    id: voucherId,
    voucherNo,
    voucherDate: input.voucherDate,
    summary: input.summary,
    status: voucherStatus,
    sourceType: input.sourceType,
    sourceId: input.sourceId || null,
    periodId: input.periodId,
    preparedBy: userId,
    approvedBy: userId,
    approvedAt: now,
    postedAt,
    createdAt: now,
    updatedAt: now,
  })

  for (let i = 0; i < input.entries.length; i++) {
    const e = input.entries[i]
    const accountId = accountCodeMap.get(e.accountCode)!
    await db.insert(voucherEntries).values({
      id: generateId(),
      voucherId,
      accountId,
      summary: e.summary || input.summary,
      debitAmount: e.debitAmount || 0,
      creditAmount: e.creditAmount || 0,
      contractId: e.contractId || null,
      projectId: e.projectId || null,
      customerId: e.customerId || null,
      supplierId: e.supplierId || null,
      sort: i,
      createdAt: now,
    })
  }

  // 直接过账或保持已审核状态
  if (!requireApproval) {
    await postVoucherToBalance(db, voucherId, input.periodId)
  }

  return { voucherId }
}

export async function postVoucherToBalance(
  db: any,
  voucherId: string,
  periodId: string,
) {
  const rawEntries = await db
    .select({
      accountId: voucherEntries.accountId,
      totalDebit: sql`coalesce(sum(${voucherEntries.debitAmount}), 0)`,
      totalCredit: sql`coalesce(sum(${voucherEntries.creditAmount}), 0)`,
    })
    .from(voucherEntries)
    .where(eq(voucherEntries.voucherId, voucherId))
    .groupBy(voucherEntries.accountId)
    .all()
  const rows = rawEntries.map((r: any) => ({
    account_id: r.accountId,
    total_debit: Number(r.totalDebit),
    total_credit: Number(r.totalCredit),
  }))

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  for (const row of rows) {
    const debit = Number(row.total_debit)
    const credit = Number(row.total_credit)

    const existing = await db.select({ id: accountBalances.id, periodDebit: accountBalances.periodDebit, periodCredit: accountBalances.periodCredit })
      .from(accountBalances)
      .where(and(eq(accountBalances.accountId, row.account_id), eq(accountBalances.periodId, periodId)))
      .limit(1)

    if (existing.length > 0) {
      await db.update(accountBalances).set({
        periodDebit: Number(existing[0].periodDebit) + debit,
        periodCredit: Number(existing[0].periodCredit) + credit,
        closingDebit: sql`opening_debit + period_debit + ${debit}`,
        closingCredit: sql`opening_credit + period_credit + ${credit}`,
        updatedAt: now,
      }).where(eq(accountBalances.id, existing[0].id))
    } else {
      await db.insert(accountBalances).values({
        id: generateId(),
        accountId: row.account_id,
        periodId,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: debit,
        periodCredit: credit,
        closingDebit: debit,
        closingCredit: credit,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
}

export async function getOrCreatePeriod(db: any, dateStr?: string): Promise<{ id: string; year: number; month: number }> {
  const now = new Date()
  const year = dateStr ? Number(dateStr.slice(0, 4)) : now.getFullYear()
  const month = dateStr ? Number(dateStr.slice(5, 7)) : now.getMonth() + 1

  const existing = await db.select({ id: accountingPeriods.id })
    .from(accountingPeriods)
    .where(and(eq(accountingPeriods.year, year), eq(accountingPeriods.month, month)))
    .limit(1)

  if (existing.length > 0) return { id: existing[0].id, year, month }

  const periodId = generateId()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(accountingPeriods).values({
    id: periodId, year, month, startDate, endDate, createdAt: nowStr,
  })

  return { id: periodId, year, month }
}
