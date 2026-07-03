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

