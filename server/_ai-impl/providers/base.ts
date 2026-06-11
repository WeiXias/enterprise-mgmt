import type { AIProvider, AIChatRequest, AIChatResponse, AIProviderCapability } from '../types'

export abstract class OpenAICompatibleBase implements AIProvider {
  abstract name: string
  abstract readonly type: string
  readonly baseUrl: string
  protected readonly apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  abstract get capabilities(): AIProviderCapability

  async listModels(): Promise<string[]> {
    const res = await $fetch<{ data?: { id: string }[] }>(`${this.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    return (res.data || []).map((m) => m.id)
  }

  async chat(req: AIChatRequest): Promise<AIChatResponse> {
    const startTime = Date.now()
    const body = {
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }

    const res = await $fetch<{
      choices?: { message?: { content: string } }[]
      model?: string
      usage?: { prompt_tokens: number; completion_tokens: number }
    }>(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
      timeout: 120000,
    })

    return {
      content: res.choices?.[0]?.message?.content || '',
      model: res.model || req.model,
      usage: res.usage
        ? { promptTokens: res.usage.prompt_tokens, completionTokens: res.usage.completion_tokens }
        : undefined,
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.listModels()
      return true
    } catch {
      return false
    }
  }
}
