// ============================================================
// 业务模型类型定义
// ============================================================

// ---- 用户与认证 ----
export type UserRole = 'admin' | 'sales_manager' | 'sales_member' | 'finance'

export interface User {
  id: string
  username: string
  name: string
  phone?: string
  email?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: Pick<User, 'id' | 'username' | 'name' | 'role' | 'avatarUrl'>
}

export interface ChangePasswordPayload {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

// ---- 客户 ----
export type CustomerStatus = 'potential' | 'intentional' | 'closed' | 'lost'

export interface Customer {
  id: string
  name: string
  industry?: string
  address?: string
  phone?: string
  email?: string
  remark?: string
  status: CustomerStatus
  ownerUserId: string
  owner?: Pick<User, 'id' | 'name'>
  lostReason?: string
  createdAt: string
  updatedAt: string
}

export interface CustomerList extends Customer {
  primaryContact?: Pick<Contact, 'id' | 'name' | 'phone'>
  tags: Tag[]
  contactCount: number
  opportunityCount: number
  contractCount: number
  lastFollowUpAt?: string
}

export interface CustomerDetail extends Customer {
  contacts: Contact[]
  latestFollowUps: FollowUp[]
  opportunities: OpportunitySummary[]
  contracts: ContractSummary[]
  tags: Tag[]
}

export interface CreateCustomerPayload {
  name: string
  industry?: string
  address?: string
  remark?: string
  ownerUserId?: string
  tagIds?: string[]
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
  status?: CustomerStatus
}

// ---- 联系人 ----
export interface Contact {
  id: string
  customerId: string
  name: string
  position?: string
  phone?: string
  email?: string
  isPrimary: boolean
  remark?: string
  createdAt: string
}

export interface CreateContactPayload {
  name: string
  position?: string
  phone?: string
  email?: string
  isPrimary?: boolean
  remark?: string
}

export interface OpportunitySummary {
  id: string
  name: string
  status: string
  amount?: number
}

// ---- 标签 ----
export interface Tag {
  id: string
  name: string
  color?: string
  createdAt: string
}

export interface CreateTagPayload {
  name: string
  color?: string
}

// ---- 跟进记录 ----
export type FollowUpType = 'phone' | 'visit' | 'wechat' | 'email' | 'other'

export interface FollowUp {
  id: string
  customerId?: string
  opportunityId?: string
  userId: string
  user?: Pick<User, 'id' | 'name'>
  type: FollowUpType
  content: string
  nextFollowUpAt?: string
  createdAt: string
}

export interface CreateFollowUpPayload {
  type: FollowUpType
  content: string
  nextFollowUpAt?: string
  opportunityId?: string
}

// ---- 商机 ----
export type OpportunityStatus =
  | 'initial_contact'
  | 'requirement_confirmed'
  | 'proposal_submitted'
  | 'business_negotiation'
  | 'closed_won'
  | 'closed_lost'

export interface Opportunity {
  id: string
  name: string
  customerId: string
  customer?: Pick<Customer, 'id' | 'name'>
  ownerUserId: string
  owner?: Pick<User, 'id' | 'name'>
  estimatedAmount: number
  estimatedCloseDate?: string
  source?: string
  competitor?: string
  status: OpportunityStatus
  winReason?: string
  lostReason?: string
  createdAt: string
  updatedAt: string
}

export interface OpportunityListItem extends Opportunity {
  productCount: number
}

export interface OpportunityProduct {
  id: string
  opportunityId: string
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
  discount: number
}

export interface OpportunityDetail extends Opportunity {
  products: OpportunityProduct[]
  quotes: QuoteSummary[]
  followUps: FollowUp[]
  contract?: ContractSummary | null
}

export interface CreateOpportunityPayload {
  name: string
  customerId: string
  ownerUserId?: string
  estimatedAmount?: number
  estimatedCloseDate?: string
  source?: string
  competitor?: string
  products?: {
    productId: string
    quantity: number
    unitPrice?: number
    discount?: number
  }[]
}

export interface UpdateOpportunityPayload extends Partial<Omit<CreateOpportunityPayload, 'customerId'>> {
  status?: OpportunityStatus
}

// ---- 报价 ----
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface Quote {
  id: string
  quoteNo: string
  opportunityId: string
  name: string
  totalAmount: number
  discountAmount: number
  finalAmount: number
  status: QuoteStatus
  validUntil?: string
  pdfUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  items: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quoteId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
}

export interface QuoteSummary {
  id: string
  quoteNo: string
  totalAmount: number
  status: QuoteStatus
  createdAt: string
}

// ---- 产品 ----
export type ProductStatus = 'on_sale' | 'off_shelf'

export interface Product {
  id: string
  name: string
  code: string
  standardPrice: number
  costPrice?: number
  description?: string
  categoryId?: string
  category?: ProductCategory | null
  status: ProductStatus
  createdAt: string
  updatedAt: string
}

export interface ProductListItem extends Product {
  quoteCount: number
  contractCount: number
}

export interface CreateProductPayload {
  name: string
  code: string
  categoryId?: string
  standardPrice: number
  costPrice?: number
  description?: string
}

export interface ProductCategory {
  id: string
  name: string
  parentId?: string
  productCount: number
  children?: ProductCategory[]
}

export interface CreateCategoryPayload {
  name: string
  parentId?: string
  sort?: number
}

// ---- 合同 ----
export type ContractStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'terminated'

export interface Contract {
  id: string
  code: string
  name: string
  customerId: string
  customer?: Pick<Customer, 'id' | 'name'>
  opportunityId?: string
  opportunity?: Pick<Opportunity, 'id' | 'name'>
  partyA: string
  partyB: string
  totalAmount: number
  receivedAmount: number
  paymentMethod?: string
  startDate?: string
  endDate?: string
  signDate?: string
  status: ContractStatus
  terms?: string
  rejectReason?: string
  approvedBy?: string
  approvedAt?: string
  createdBy: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface ContractListItem extends Contract {
  paymentProgress: number
  hasOverduePayment: boolean
}

export interface ContractProduct {
  id: string
  contractId: string
  productId: string
  productName?: string
  quantity: number
  unitPrice: number
  discount: number
}

export interface ContractDetail extends Contract {
  products: ContractProduct[]
  paymentPlans: PaymentPlan[]
  payments: Payment[]
  attachments: Attachment[]
  projects: ProjectSummary[]
  commissions: CommissionSummary[]
}

export interface CreateContractPayload {
  name: string
  customerId: string
  opportunityId?: string
  totalAmount: number
  paymentTerms?: string
  startDate?: string
  endDate?: string
  signDate?: string
  terms?: string
  partyA?: string
  partyB?: string
  products?: {
    productId: string
    quantity: number
    unitPrice: number
    discount?: number
  }[]
  paymentPlans?: {
    planAmount?: number
    planDate?: string
    remark?: string
  }[]
}

export interface ContractSummary {
  id: string
  contractNo?: string
  code?: string
  name: string
}

export interface ContractLedgerItem {
  contractNo: string
  name: string
  customer: string
  totalAmount: number
  receivedAmount: number
  unreceivedAmount: number
  paymentProgress: number
  nextPaymentDate?: string
  nextPaymentAmount?: number
  status: ContractStatus
}

// ---- 收付款 ----
export type PaymentStatus = 'pending' | 'paid' | 'overdue'
export type PaymentMethod = 'bank_transfer' | 'check' | 'cash' | 'alipay' | 'wechat_pay' | 'other'

export interface PaymentPlan {
  id: string
  contractId: string
  amount: number
  planDate: string
  actualAmount: number
  status: PaymentStatus
  remark?: string
  createdAt: string
}

export interface CreatePaymentPlanPayload {
  amount: number
  planDate: string
  remark?: string
}

export interface Payment {
  id: string
  contractId: string
  paymentPlanId?: string
  amount: number
  paymentDate: string
  paymentMethod?: PaymentMethod
  receiptNo?: string
  remark?: string
  createdBy: string
  createdAt: string
}

export interface CreatePaymentPayload {
  paymentPlanId?: string
  amount: number
  paymentDate: string
  paymentMethod?: PaymentMethod
  receiptNo?: string
  remark?: string
}

// ---- 附件 ----
export interface Attachment {
  id: string
  contractId: string
  fileName: string
  fileSize: number
  uploadedBy: string
  createdAt: string
}

// ---- 项目 ----
export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type DeliverableStatus = 'pending' | 'submitted' | 'accepted' | 'rejected'

export interface Project {
  id: string
  name: string
  contractId?: string
  contract?: ContractSummary | null
  ownerUserId: string
  owner?: Pick<User, 'id' | 'name'>
  startDate?: string
  endDate?: string
  budget?: number
  description?: string
  status: ProjectStatus
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectListItem extends Project {
  progress: number
  taskStats: {
    total: number
    completed: number
    inProgress: number
    overdue: number
  }
}

export interface ProjectDetail extends Project {
  members: ProjectMember[]
  tasks: Task[]
  deliverables: Deliverable[]
}

export interface ProjectMember {
  id: string
  userId: string
  name: string
  role: 'leader' | 'member'
}

export interface ProjectSummary {
  id: string
  name: string
  status: ProjectStatus
}

export interface CreateProjectPayload {
  name: string
  contractId?: string
  ownerUserId?: string
  budget?: number
  description?: string
  startDate?: string
  endDate?: string
  members?: { userId: string; role: 'leader' | 'member' }[]
}

export interface Task {
  id: string
  projectId: string
  title: string
  name: string
  description?: string
  assigneeId?: string
  assignee?: Pick<User, 'id' | 'name'> | null
  priority: TaskPriority
  status: TaskStatus
  startDate?: string
  dueDate?: string
  endDate?: string
  completedAt?: string
  sortOrder: number
  progress?: number
  remark?: string
  createdAt: string
}

export interface CreateTaskPayload {
  title?: string
  name?: string
  description?: string
  assigneeId?: string
  priority?: TaskPriority
  startDate?: string
  dueDate?: string
  endDate?: string
}

export interface Deliverable {
  id: string
  projectId: string
  name: string
  description?: string
  filePath?: string
  status: DeliverableStatus
  acceptedAt?: string
  acceptedBy?: string
  createdAt: string
}

export interface CreateDeliverablePayload {
  name: string
  description?: string
}

export interface GanttTask {
  id: string
  title: string
  assignee?: string | null
  startDate?: string | null
  endDate?: string | null
  progress: number
  status: TaskStatus
  dependencies: string[]
}

export interface GanttData {
  project: { startDate?: string; endDate?: string }
  tasks: GanttTask[]
}

// ---- 提成 ----
export type CommissionStatus = 'pending' | 'approved' | 'rejected' | 'paid'
export type CommissionBaseType = 'contract_amount' | 'received_amount'

export interface Commission {
  id: string
  user: Pick<User, 'id' | 'name'>
  contract: Pick<Contract, 'id' | 'code' | 'name'>
  baseAmount: number
  rate: number
  amount: number
  adjustedAmount?: number
  adjustReason?: string
  status: CommissionStatus
  createdAt: string
}

export interface CommissionRule {
  id: string
  name: string
  baseType: CommissionBaseType
  rate: number
  productId?: string
  productName?: string
  minAmount?: number
  maxAmount?: number
  isActive: boolean
  priority: number
}

export interface CreateCommissionRulePayload {
  name: string
  baseType: CommissionBaseType
  rate: number
  productId?: string
  minAmount?: number
  maxAmount?: number
  priority?: number
}

export interface CalculatedCommission {
  userId: string
  userName: string
  ruleId: string
  ruleName: string
  baseAmount: number
  rate: number
  amount: number
}

export interface CommissionPayout {
  id: string
  payoutDate: string
  commissionIds: string[]
  amount: number
  status: 'pending' | 'confirmed'
  createdAt: string
}

export interface CreatePayoutPayload {
  commissionIds: string[]
  payoutDate: string
}

export interface CommissionSummary {
  id: string
  amount: number
  status: CommissionStatus
}

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

// ---- 通知 ----
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content?: string
  referenceId?: string
  referenceType?: string
  isRead: boolean
  createdAt: string
}

// ---- 系统 ----
export interface SystemConfig {
  company_name?: string
  company_logo?: string
  system_name?: string
}

export interface CodeRule {
  module: string
  prefix: string
  digits: number
  separator: string
  dateFormat?: string
  nextCode: string
}

export interface OperationLog {
  id: string
  user?: Pick<User, 'id' | 'name'> | null
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT'
  module: string
  recordId?: string
  detail?: unknown
  ipAddress?: string
  createdAt: string
}

export interface BackupRecord {
  id: string
  fileName: string
  fileSize: number
  createdAt: string
}

// ---- 仪表盘 ----
export interface DashboardData {
  todayReminders: {
    followUps: number
    expiringContracts: number
    overduePayments?: number
    dueTasks: number
  }
  kpi: {
    customerTotal: number
    opportunityInProgress: number
    contractAmountThisMonth: number
    receivedAmountThisMonth: number
  }
  recentActivities: ActivityItem[]
  recentCustomers: Customer[]
  recentOpportunities: Opportunity[]
  funnelData: SalesFunnelData
  paymentTrend: { month: string; contracted: number; received: number }[]
}

export interface ActivityItem {
  id: string
  type: string
  description: string
  user: string
  createdAt: string
}

export interface SalesFunnelData {
  stages: SalesFunnelStage[]
  total: number
  totalAmount: number
  winRate: number
}

export interface SalesFunnelStage {
  status: OpportunityStatus
  label: string
  count: number
  totalAmount: number
}

// ---- 导出 ----
export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: { row: number; reason: string }[]
}

// ============================================================
// AI 数字员工
// ============================================================

export type AIProviderType = 'deepseek' | 'custom'
export type AIEmployeeRole = 'contract_reviewer' | 'contract_writer' | 'opportunity_analyst' | 'customer_insight' | 'custom'
export type AIReviewStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type AIRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface AIProvider {
  id: string
  name: string
  type: AIProviderType
  baseUrl: string
  models: string[]
  isDefault: boolean
  isEnabled: boolean
  createdAt: string
}

export interface AIEmployee {
  id: string
  name: string
  role: AIEmployeeRole
  roleLabel: string
  providerId: string
  providerName?: string
  model: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AIReview {
  id: string
  contractId: string
  aiEmployeeId: string
  aiEmployeeName?: string
  status: AIReviewStatus
  result: AIReviewResult | null
  modelUsed: string
  duration: number | null
  errorMessage: string | null
  triggeredBy: string
  promptTokens?: number | null
  completionTokens?: number | null
  createdAt: string
}

export interface AIReviewResult {
  summary: string
  riskLevel: AIRiskLevel
  score: number
  suggestions: string[]
  riskFlags: {
    severity: AIRiskLevel
    clause: string
    description: string
    suggestion: string | null
  }[]
  highlights: {
    positive: string[]
    negative: string[]
  }
}

export interface CreateAIProviderPayload {
  name: string
  type: AIProviderType
  baseUrl: string
  apiKey: string
  models: string[]
  isDefault?: boolean
}

export interface UpdateAIProviderPayload {
  name?: string
  baseUrl?: string
  apiKey?: string
  models?: string[]
  isDefault?: boolean
  isEnabled?: boolean
}

export interface CreateAIEmployeePayload {
  name: string
  role: AIEmployeeRole
  roleLabel: string
  providerId: string
  model: string
  systemPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface UpdateAIEmployeePayload {
  name?: string
  role?: AIEmployeeRole
  roleLabel?: string
  providerId?: string
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  isActive?: boolean
}

// ---- 待办模块 ----
export type TodoPriority = 'urgent_important' | 'urgent_not_important' | 'important_not_urgent' | 'not_urgent_not_important'
export type TodoStatus = 'todo' | 'in_progress' | 'completed'
export type ListColor = 'amber' | 'teal' | 'blue' | 'coral' | 'stone' | 'violet'

export interface TodoList {
  id: string
  name: string
  color: ListColor
  icon?: string
  sortOrder: number
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  todos?: Todo[]
  todoCount?: number
  completedCount?: number
}

export interface Todo {
  id: string
  listId: string
  title: string
  note?: string
  priority: TodoPriority
  status: TodoStatus
  dueDate?: string
  remindAt?: string
  completedAt?: string
  sortOrder: number
  userId: string
  customerId?: string
  contractId?: string
  projectId?: string
  opportunityId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  subtasks?: TodoSubtask[]
  tags?: TodoTag[]
  customer?: Pick<Customer, 'id' | 'name'>
  contract?: Pick<Contract, 'id' | 'name'>
  project?: Pick<Project, 'id' | 'name'>
  opportunity?: Pick<Opportunity, 'id' | 'name'>
}

export interface TodoSubtask {
  id: string
  todoId: string
  title: string
  completed: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface TodoTag {
  id: string
  name: string
  color?: string
  userId: string
  createdAt: string
}

export interface CreateTodoListPayload {
  name: string
  color?: ListColor
  icon?: string
}

export interface UpdateTodoListPayload {
  name?: string
  color?: ListColor
  icon?: string
  sortOrder?: number
}

export interface CreateTodoPayload {
  listId: string
  title: string
  note?: string
  priority?: TodoPriority
  dueDate?: string
  remindAt?: string
  customerId?: string
  contractId?: string
  projectId?: string
  opportunityId?: string
}

export interface UpdateTodoPayload {
  title?: string
  note?: string
  priority?: TodoPriority
  status?: TodoStatus
  dueDate?: string | ''
  remindAt?: string | ''
  listId?: string
  customerId?: string | null
  contractId?: string | null
  projectId?: string | null
  opportunityId?: string | null
}

export interface CreateTodoSubtaskPayload {
  title: string
}

export interface UpdateTodoSubtaskPayload {
  title?: string
  completed?: boolean
}

export interface CreateTodoTagPayload {
  name: string
  color?: string
}

// ---- 合同模板 AI 生成 & Word 导入 ----
export interface AIGenerateTemplateRequest {
  prompt: string
  category?: string
  aiEmployeeId?: string
}

export interface AIGenerateTemplateResponse {
  content: string
  placeholders: { key: string; label: string }[]
  suggestedName: string
  suggestedDescription: string
}

export interface ImportDocxResponse {
  content: string
  placeholders: { key: string; label: string }[]
  suggestedName: string
}
