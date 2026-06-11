import { OpenAICompatibleBase } from './base'
import type { AIProviderCapability } from '../types'

export class DeepSeekProvider extends OpenAICompatibleBase {
  name = 'DeepSeek'
  readonly type = 'deepseek'

  get capabilities(): AIProviderCapability {
    return {
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsVision: false,
      maxContextTokens: 128000,
    }
  }
}
