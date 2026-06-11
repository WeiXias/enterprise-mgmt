/**
 * 带认证的 API 请求
 * 通过 Nuxt 插件 $api 自动附加 Bearer token
 *
 * 用法:
 *   const { $api } = useNuxtApp()
 *   const res = await $api('/api/customers', { params: { page: 1 } })
 *   const res = await $api('/api/customers', { method: 'POST', body: { name: '...' } })
 */
export function useApi() {
  const { $api } = useNuxtApp()
  return { $api }
}
