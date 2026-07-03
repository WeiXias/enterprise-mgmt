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

