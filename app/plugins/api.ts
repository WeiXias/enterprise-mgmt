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
    async onResponseError({ response, request, options }) {
      if (response.status === 401 && authStore.refreshToken) {
        const refreshed = await authStore.refreshAccessToken()
        if (refreshed) {
          // 更新重试请求的 token
          const headers = new Headers(options.headers)
          headers.set('Authorization', `Bearer ${authStore.accessToken}`)
          options.headers = headers
          return $fetch(request as string, options as unknown as Record<string, unknown>)
        }
      }
    }
  })

  return {
    provide: { api }
  }
})
