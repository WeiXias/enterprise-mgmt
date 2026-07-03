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

