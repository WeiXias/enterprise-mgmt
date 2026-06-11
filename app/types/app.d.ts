// Type augmentation: extend $api method support to all HTTP methods
import type { FetchOptions } from 'ofetch'

declare global {
  interface NuxtApp {
    $api: {
      (url: string, options?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: unknown; params?: Record<string, unknown>; headers?: Record<string, string> }): Promise<unknown>
    }
  }
}

export {}
