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

