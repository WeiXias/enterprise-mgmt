export default defineNuxtRouteMiddleware((to) => {
  // 服务端渲染阶段直接放行，因为 accessToken 只在浏览器 localStorage 中
  if (import.meta.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }
})
