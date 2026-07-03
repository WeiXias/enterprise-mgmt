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
