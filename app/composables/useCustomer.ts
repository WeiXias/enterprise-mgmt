/**
 * 客户模块共享工具
 */
export function useCustomer() {
  const authStore = useAuthStore()

  function isAdminOrManager() {
    const role = authStore.user?.role
    return role === 'admin' || role === 'sales_manager'
  }

  return { isAdminOrManager }
}

/**
 * 行业字典加载（带缓存）
 */
const _industryCache: string[] = []
let _industryLoading = false

export function useDictIndustry() {
  const options = ref<string[]>(_industryCache)

  async function fetchIndustry() {
    if (_industryCache.length > 0) {
      options.value = _industryCache
      return
    }
    if (_industryLoading) return
    _industryLoading = true
    try {
      const res = await $fetch('/api/dict/industry', { headers: useAuthHeaders() }) as any
      if (res?.code === 0) {
        _industryCache.length = 0
        _industryCache.push(...(res.data || []).map((o: any) => o.label))
        options.value = _industryCache
      }
    } catch {}
    finally { _industryLoading = false }
  }

  onMounted(fetchIndustry)
  return { industryOptions: options, fetchIndustry }
}
