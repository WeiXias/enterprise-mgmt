interface TableOptions {
  apiUrl: string
  pageSize?: number
  debounceMs?: number
}

interface PaginatedResult<T = unknown> {
  code: number
  data: { items?: T[]; list?: T[]; total: number }
}

export function useTable<T = unknown>(options: TableOptions) {
  const { apiUrl, pageSize: defaultPageSize = 20, debounceMs = 300 } = options
  const { $api } = useNuxtApp()

  const loading = ref(false)
  const list = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const keyword = ref('')
  const filters = ref<Record<string, unknown>>({})

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  async function fetchList() {
    loading.value = true
    try {
      const params: Record<string, unknown> = {
        page: page.value,
        pageSize: pageSize.value
      }
      if (keyword.value) params.keyword = keyword.value
      Object.assign(params, filters.value)

      const res = await $api(apiUrl, { params }) as PaginatedResult<T>
      if (res?.code === 0 && res.data) {
        list.value = res.data.items || res.data.list || []
        total.value = res.data.total || 0
      }
    } catch {
      // 错误由调用方处理
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