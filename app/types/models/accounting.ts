// ---- 会计 ----
export type CategoryType = 'asset' | 'liability' | 'equity' | 'cost' | 'revenue_expense'
export type BalanceDirection = 'debit' | 'credit'
export type VoucherStatusType = 'draft' | 'reviewed' | 'approved' | 'posted'

export interface Account {
  id: string
  code: string
  name: string
  parentId?: string | null
  categoryType: CategoryType
  balanceDirection: BalanceDirection
  level: number
  sort: number
  isSystem: number
  isEnabled: number
  remark?: string | null
  children?: Account[]
}

export interface Voucher {
  id: string
  voucherNo: string
  voucherDate: string
  summary?: string | null
  status: VoucherStatusType
  sourceType?: string | null
  sourceId?: string | null
  periodId: string
  preparedBy: string
  creatorName?: string
  reviewedBy?: string | null
  approvedBy?: string | null
  reviewedAt?: string | null
  approvedAt?: string | null
  postedAt?: string | null
  createdAt: string
}

export interface VoucherEntry {
  id: string
  voucherId: string
  accountId: string
  accountCode?: string
  accountName?: string
  summary?: string | null
  debitAmount: number
  creditAmount: number
  contractId?: string | null
  projectId?: string | null
  customerId?: string | null
  supplierId?: string | null
  sort: number
}

export interface AccountBalance {
  id: string
  accountId: string
  accountCode?: string
  accountName?: string
  categoryType?: CategoryType
  periodId: string
  openingDebit: number
  openingCredit: number
  periodDebit: number
  periodCredit: number
  closingDebit: number
  closingCredit: number
}

export interface AccountingPeriod {
  id: string
  year: number
  month: number
  startDate: string
  endDate: string
  isClosed: number
  closedBy?: string | null
  closedAt?: string | null
}
