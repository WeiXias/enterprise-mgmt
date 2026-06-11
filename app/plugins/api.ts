import type { FetchOptions } from 'ofetch'

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  const api = $fetch.create({
    onRequest({ options }) {
      const token = authStore.accessToken
      if (token) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }
    },
    async onResponseError({ response }) {
      // token 过期时尝试刷新
      if (response.status === 401 && authStore.refreshToken) {
        const refreshed = await authStore.refreshAccessToken()
        if (refreshed) {
          // 刷新成功，重试原始请求（由调用方处理）
        }
      }
    }
  })

  // Wrapper that loosens method type
  const apiWrapper = (url: string, options?: { method?: string; body?: unknown; params?: Record<string, unknown> }) => {
    return api(url, options as Record<string, unknown>)
  }

  return {
    provide: { api: apiWrapper }
  }
})
