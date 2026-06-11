import type { AIProvider } from './types'
import { DeepSeekProvider } from './providers/deepseek'
import { CustomProvider } from './providers/custom'

interface ProviderConfig {
  type: string
  baseUrl: string
  apiKey: string
  name?: string
}

export function createProvider(config: ProviderConfig): AIProvider {
  switch (config.type) {
    case 'deepseek':
      return new DeepSeekProvider(config.baseUrl || 'https://api.deepseek.com', config.apiKey)
    case 'custom':
      return new CustomProvider(config.baseUrl, config.apiKey, config.name)
    default:
      throw new Error(`不支持的供应商类型: ${config.type}`)
  }
}
