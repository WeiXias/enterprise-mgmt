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

