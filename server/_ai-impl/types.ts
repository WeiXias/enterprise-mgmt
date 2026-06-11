export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIChatRequest {
  messages: AIMessage[]
  model: string
  temperature?: number
  maxTokens?: number
}

export interface AIChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface AIProviderCapability {
  supportsStreaming: boolean
  supportsFunctionCalling: boolean
  supportsVision: boolean
  maxContextTokens: number
}

export interface AIProvider {
  readonly name: string
  readonly type: string
  readonly baseUrl: string
  readonly capabilities: AIProviderCapability
  listModels(): Promise<string[]>
  chat(request: AIChatRequest): Promise<AIChatResponse>
  testConnection(): Promise<boolean>
}

export interface AIReviewResult {
  summary: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  score: number
  suggestions: string[]
  riskFlags: {
    severity: 'low' | 'medium' | 'high' | 'critical'
    clause: string
    description: string
    suggestion: string | null
  }[]
  highlights: {
    positive: string[]
    negative: string[]
  }
}
