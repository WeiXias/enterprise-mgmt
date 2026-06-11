// ============================================================
// API 请求/响应类型定义
// ============================================================

// ---- 统一响应 ----
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message?: string
}

export interface PaginatedData<T = unknown> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type PaginatedResponse<T = unknown> = ApiResponse<PaginatedData<T>>

export interface ErrorResponse {
  code: number
  message: string
  details?: unknown
}

// ---- 通用查询参数 ----
export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface SortParams {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchParams {
  keyword?: string
}

export interface DateRangeParams {
  startDate?: string
  endDate?: string
}

export interface BaseListParams extends PaginationParams, SortParams, SearchParams {}

// ---- 各模块查询参数 ----
export interface CustomerListParams extends BaseListParams {
  status?: string
  ownerId?: string
  industry?: string
  tagIds?: string
}

export interface OpportunityListParams extends BaseListParams {
  status?: string
  customerId?: string
  ownerId?: string
}

export interface ProductListParams extends BaseListParams {
  categoryId?: string
  status?: string
}

export interface ContractListParams extends BaseListParams {
  status?: string
  customerId?: string
  hasOverduePayment?: boolean
}

export interface ContractLedgerParams extends BaseListParams, DateRangeParams {
  status?: string
}

export interface ProjectListParams extends BaseListParams {
  status?: string
  ownerId?: string
  contractId?: string
}

export interface CommissionListParams extends BaseListParams {
  userId?: string
  contractId?: string
  status?: string
}

export interface FinanceTransactionParams extends BaseListParams, DateRangeParams {
  type?: string
  category?: string
}

export interface OperationLogParams extends BaseListParams {
  userId?: string
  module?: string
  action?: string
}

export interface OpportunityStatsParams extends DateRangeParams {
  groupBy?: 'month' | 'quarter' | 'year'
}

export interface PaymentStatsParams extends DateRangeParams {
  groupBy?: 'month' | 'quarter' | 'year'
}

export interface CommissionStatsParams extends DateRangeParams {
  groupBy?: 'month' | 'user'
}

export interface ContractPaymentStatsParams extends DateRangeParams {
  groupBy?: 'month' | 'quarter' | 'year'
}
