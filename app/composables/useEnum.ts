// composable 级缓存：避免多次请求
type EnumData = Record<string, { label: string; value: string }[]>

let enumCache: EnumData | null = null
let pendingPromise: Promise<EnumData> | null = null

async function fetchEnums(): Promise<EnumData> {
  if (enumCache) return enumCache
  if (pendingPromise) return pendingPromise

  pendingPromise = $fetch('/api/enums').then((res: any) => {
    if (res?.code !== 0) throw new Error(res?.message || '获取枚举失败')
    enumCache = res.data as EnumData
    return enumCache!
  }).finally(() => {
    pendingPromise = null
  })

  return pendingPromise
}

export function useEnum() {
  const data = ref<EnumData | null>(enumCache)

  // 首次调用时加载
  async function ensureLoaded() {
    if (!data.value) {
      data.value = await fetchEnums()
    }
  }

  function getOptionMap(enumType: string): Record<string, string> {
    if (!data.value) return {}
    const options = data.value[enumType] || []
    const map: Record<string, string> = {}
    for (const opt of options) {
      map[opt.value] = opt.label
    }
    return map
  }

  function getLabel(enumType: string, value: string): string {
    if (!value) return ''
    const map = getOptionMap(enumType)
    return map[value] || value
  }

  function getOptions(enumType: string): { label: string; value: string }[] {
    if (!data.value) return []
    return data.value[enumType] || []
  }

  return { getLabel, getOptions, ensureLoaded }
}
