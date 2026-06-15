export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // SSR: 从请求 cookie 恢复用户信息
  if (import.meta.server) {
    const event = useRequestEvent()
    const cookieStr = event?.node?.req?.headers?.cookie || ''
    if (cookieStr) {
      const match = cookieStr.match(/(?:^|;\s*)auth_user=([^;]+)/)
      if (match) {
        try {
          authStore.user = JSON.parse(decodeURIComponent(match[1]))
        } catch { /* ignore */ }
      }
    }
  }

  authStore.init()
})
