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

