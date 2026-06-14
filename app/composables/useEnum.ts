// composable 级缓存：避免多次请求
type EnumData = Record<string, { label: string; value: string }[]>

let enumCache: EnumData | null = null
let pendingPromise: Promise<EnumData> | null = null

async function fetchEnums(): Promise<EnumData> {
  if (enumCache) return enumCache
  if (pendingPromise) return pendingPromise

  pendingPromise = $fetch('/api/enums', {
    headers: useAuthHeaders(),
  }).then((res: any) => {
    if (res?.code !== 0) throw new Error(res?.message || '获取枚举失败')
    enumCache = res.data as EnumData
    return enumCache!
  }).finally(() => {
    pendingPromise = null
  })

  return pendingPromise
}

// DB 字典缓存
const dictCaches: Record<string, { label: string; value: string }[] | null> = {}

async function fetchDict(type: string): Promise<{ label: string; value: string }[]> {
  try {
    const res = await $fetch(`/api/dict/${type}`, {
      headers: useAuthHeaders(),
    }) as any
    if (res?.code === 0) {
      return (res.data || []).map((item: any) => ({
        value: item.value,
        label: item.label,
      }))
    }
  } catch { /* 未登录或不存在的字典类型 */ }

  return []
}

export function useEnum() {
  const data = ref<EnumData | null>(enumCache)

  async function ensureLoaded() {
    if (!data.value) {
      data.value = await fetchEnums()
    }
  }

  function getOptionMap(enumType: string): Record<string, string> {
    if (!data.value) return {}
    const options = getOptions(enumType)
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

  /** case-insensitive 查找 enum key */
  function findKey(target: string): string | undefined {
    if (!data.value) return undefined
    // 精确匹配
    if (data.value[target]) return target
    // 忽略大小写和尾 s 匹配
    const t = target.toLowerCase().replace(/s$/, '')
    return Object.keys(data.value).find(k => k.toLowerCase().replace(/s$/, '') === t)
  }

  function getOptions(enumType: string): { label: string; value: string }[] {
    if (!data.value) return []
    const key = findKey(enumType)
    return key ? (data.value[key] || []) : []
  }

  async function fetchDictOptions(enumType: string): Promise<{ label: string; value: string }[]> {
    await ensureLoaded()
    const enumOpts = getOptions(enumType)
    if (enumOpts.length > 0) return enumOpts
    return await fetchDict(enumType)
  }

  return { getLabel, getOptions, ensureLoaded, fetchDictOptions }
}
