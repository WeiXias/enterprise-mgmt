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
