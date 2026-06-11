import { OpenAICompatibleBase } from './base'
import type { AIProviderCapability } from '../types'

export class CustomProvider extends OpenAICompatibleBase {
  name = '自定义'
  readonly type = 'custom'

  constructor(baseUrl: string, apiKey: string, name?: string) {
    super(baseUrl, apiKey)
    if (name) this.name = name
  }

  get capabilities(): AIProviderCapability {
    return {
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsVision: false,
      maxContextTokens: 128000,
    }
  }
}
