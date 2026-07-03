// ---- 财务 ----
export type TransactionType = 'income' | 'expense'

export interface FinanceCategory {
  id: string
  name: string
  type: TransactionType
  parentId?: string
  createdAt: string
}

export interface FinanceTransaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  contractId?: string
  transactionDate: string
  description?: string
  createdBy: string
  createdAt: string
}

export interface CreateTransactionPayload {
  type: TransactionType
  amount: number
  category: string
  contractId?: string
  transactionDate: string
  description?: string
}

export interface FinanceOverview {
  stats: {
    totalIncome: number
    totalExpense: number
    netBalance: number
    overduePaymentCount: number
    pendingReimbursementCount: number
  }
  recentTransactions: FinanceTransaction[]
}

export interface MonthlyReport {
  month: string
  income: number
  expense: number
  profit: number
}

export interface Reimbursement {
  id: string
  applicantId: string
  applicant?: Pick<User, 'id' | 'name'>
  amount: number
  category: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  createdAt: string
}

