interface TableOptions {
  apiUrl: string
  pageSize?: number
  debounceMs?: number
  /** 可选的搜索端点，传入则 keyword 变更时调用此端点而非走原有 apiUrl + keyword */
  searchApiUrl?: string
}

interface PaginatedResult<T = unknown> {
  code: number
  data: { items?: T[]; list?: T[]; total: number }
}

export function useTable<T = unknown>(options: TableOptions) {
  const { apiUrl, pageSize: defaultPageSize = 20, debounceMs = 300, searchApiUrl } = options
  const { $api } = useNuxtApp()

  const loading = ref(false)
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const keyword = ref('')
  const filters = ref<Record<string, unknown>>({})

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  // 组件卸载时清理 timer
  if (import.meta.client) {
    onUnmounted(() => {
      if (searchTimer) clearTimeout(searchTimer)
    })
  }

  async function fetchList() {
    loading.value = true
    try {
      const params: Record<string, unknown> = {
        page: page.value,
        pageSize: pageSize.value
      }

      // 如果有独立搜索端点，有 keyword 时走搜索端点
      if (keyword.value && searchApiUrl) {
        const searchRes = await $api('/api/search', {
          params: {
            q: keyword.value,
            type: new URLSearchParams(searchApiUrl.startsWith('/') ? searchApiUrl.slice(1) : searchApiUrl).get('type') || undefined,
            page: page.value,
            pageSize: pageSize.value,
          }
        }) as { code: number; data: { items: { id: string }[]; total: number } }
        if (searchRes?.code === 0 && searchRes.data) {
          const ids = searchRes.data.items.map((i: { id: string }) => i.id)
          params.ids = ids.join(',')
          params.page = 1
          params.pageSize = ids.length || 1
        }
      } else if (keyword.value) {
        params.keyword = keyword.value
      }
      Object.assign(params, filters.value)

      const res = await $api(apiUrl, { params }) as PaginatedResult<T>
      if (res?.code === 0 && res.data) {
        list.value = res.data.items || res.data.list || []
        total.value = res.data.total || 0
      }
    } catch {
      // 静默：列表加载失败时由业务调用方处理
    } finally {
      loading.value = false
    }
  }

  function onPageChange(p: number) {
    page.value = p
    fetchList()
  }

  function prevPage() {
    if (page.value > 1) {
      page.value--
      fetchList()
    }
  }

  function nextPage() {
    if (page.value < totalPages.value) {
      page.value++
      fetchList()
    }
  }

  function onSearchInput() {
    clearTimeout(searchTimer!)
    searchTimer = setTimeout(() => {
      page.value = 1
      fetchList()
    }, debounceMs)
  }

  function onFilterChange() {
    page.value = 1
    fetchList()
  }

  function setFilter(key: string, value: unknown) {
    filters.value = { ...filters.value, [key]: value }
  }

  function onFilter(newFilters: Record<string, unknown>) {
    filters.value = newFilters
    page.value = 1
    fetchList()
  }

  function refresh() {
    fetchList()
  }

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

  return {
    loading,
    list,
    total,
    page,
    pageSize,
    keyword,
    filters,
    totalPages,
    fetchList,
    onPageChange,
    prevPage,
    nextPage,
    onSearchInput,
    onFilterChange,
    setFilter,
    onFilter,
    refresh
  }
}