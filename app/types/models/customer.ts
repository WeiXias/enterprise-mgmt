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

