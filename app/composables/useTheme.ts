export type ThemeName = 'blue' | 'warm'

const STORAGE_KEY = 'app-theme'
const current = ref<ThemeName>('warm')

export interface SearchItem {
  label: string
  desc: string
  to: string
  icon: string
  group: string
  keywords: string[]
  source?: 'nav' | 'business'
  entityType?: string
  status?: string
}

const searchIndex: SearchItem[] = [
  { label: '客户列表', desc: '管理所有客户信息', to: '/dashboard/customers', icon: 'i-lucide-users', group: '客户经营', keywords: ['客户', 'customer', '公司', 'company', '企业', '甲方'] },
  { label: '新增客户', desc: '创建一个新客户', to: '/dashboard/customers/create', icon: 'i-lucide-user-plus', group: '客户经营', keywords: ['新建客户', '添加', '客户', 'create'] },
  { label: '商机列表', desc: '跟踪销售机会和漏斗', to: '/dashboard/opportunities', icon: 'i-lucide-flag', group: '客户经营', keywords: ['商机', '机会', 'opportunity', '销售', '线索'] },
  { label: '合同列表', desc: '查看和审批合同', to: '/dashboard/contracts', icon: 'i-lucide-file-text', group: '客户经营', keywords: ['合同', 'contract', '签约', '协议', '审批'] },
  { label: '项目列表', desc: '管理进行中的项目', to: '/dashboard/projects', icon: 'i-lucide-folder-open', group: '项目', keywords: ['项目', 'project', '项目管理', '进度'] },
  { label: '产品管理', desc: '产品信息与分类', to: '/dashboard/products', icon: 'i-lucide-tag', group: '客户经营', keywords: ['产品', 'product', '商品', '服务', '分类'] },
  { label: '提成概览', desc: '查看提成与发放情况', to: '/dashboard/commissions', icon: 'i-lucide-wallet', group: '财务', keywords: ['提成', '佣金', 'commission', '奖金', '发放'] },
  { label: '财务管理', desc: '回款、发票、收付款', to: '/dashboard/finance', icon: 'i-lucide-dollar-sign', group: '财务', keywords: ['财务', 'finance', '回款', '发票', '收款', '付款'] },
  { label: '库存管理', desc: '进销存与仓库管理', to: '/dashboard/inventory', icon: 'i-lucide-package', group: '进销存', keywords: ['库存', 'inventory', '进出库', '仓库', '货品'] },
  { label: '待办事项', desc: '我的待办任务', to: '/dashboard/todos', icon: 'i-lucide-list-checks', group: '常用', keywords: ['待办', 'todo', '任务', '提醒', '跟进'] },
  { label: '畅聊', desc: '团队即时通讯', to: '/dashboard/im', icon: 'i-lucide-message-circle', group: '常用', keywords: ['畅聊', '聊天', '消息', '私信', '沟通', 'IM'] },
  { label: '消息通知', desc: '查看所有通知', to: '/dashboard/notifications', icon: 'i-lucide-bell', group: '常用', keywords: ['通知', '提醒', '消息', '铃铛'] },
  { label: '个人中心', desc: '修改个人信息和密码', to: '/dashboard/profile', icon: 'i-lucide-user', group: '常用', keywords: ['个人', '我的', '资料', '密码', '账号'] },
  { label: '同事管理', desc: '团队成员与角色', to: '/dashboard/users', icon: 'i-lucide-user-round-plus', group: '常用', keywords: ['同事', '用户', '成员', '员工', '角色', '权限', '管理员'] },
  { label: '系统设置', desc: '配置系统参数与规则', to: '/dashboard/settings', icon: 'i-lucide-settings', group: '常用', keywords: ['设置', 'settings', '配置', '系统', '参数', '规则'] },
  { label: '操作记录', desc: '查看系统操作日志', to: '/dashboard/logs', icon: 'i-lucide-clock', group: '常用', keywords: ['日志', '操作', '记录', '审计', '历史'] },
]

function score(item: SearchItem, query: string): number {
  const q = query.toLowerCase()
  let s = 0
  if (item.label.toLowerCase().includes(q)) s += 100
  if (item.label.toLowerCase().startsWith(q)) s += 50
  for (const kw of item.keywords) {
    if (kw.toLowerCase() === q) s += 80
    else if (kw.toLowerCase().startsWith(q)) s += 40
    else if (kw.toLowerCase().includes(q)) s += 20
  }
  return s
}

export function searchNav(query: string): SearchItem[] {
  if (!query.trim()) return []
  return searchIndex
    .map(item => ({ item, score: score(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ item }) => item)
}

export function useGlobalSearch() {
  const query = ref('')
  const results = computed(() => searchNav(query.value))
  const open = ref(false)
  const selectedIndex = ref(-1)
  const inputRef = ref<HTMLInputElement>()

  // 业务数据搜索
  const businessResults = ref<SearchItem[]>([])
  const businessLoading = ref(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  // 实体图标映射
  function getBusinessIcon(type: string): string {
    const map: Record<string, string> = {
      customer: 'i-lucide-users', opportunity: 'i-lucide-flag', contract: 'i-lucide-file-text',
      project: 'i-lucide-folder-open', task: 'i-lucide-list-checks', product: 'i-lucide-tag',
      supplier: 'i-lucide-building-2', purchase_order: 'i-lucide-shopping-cart',
      sales_order: 'i-lucide-trending-up', invoice: 'i-lucide-receipt',
      todo: 'i-lucide-list-checks', subcontract_party: 'i-lucide-link',
      commission: 'i-lucide-wallet', commission_rule: 'i-lucide-credit-card',
      finance_transaction: 'i-lucide-dollar-sign', seal: 'i-lucide-stamp',
      user: 'i-lucide-user-round-plus', quote: 'i-lucide-file-check',
    }
    return map[type] || 'i-lucide-file'
  }

  watch(query, (val) => {
    if (!val.trim()) { businessResults.value = []; return }
    clearTimeout(searchTimer!)
    searchTimer = setTimeout(async () => {
      businessLoading.value = true
      try {
        const authStore = useAuthStore()
        const res = await $fetch('/api/search', {
          headers: { Authorization: `Bearer ${authStore.accessToken}` },
          params: { q: val, pageSize: 5 }
        }) as any
        if (res?.code === 0 && res.data?.items) {
          businessResults.value = (res.data.items as any[]).map((item: any) => ({
            label: item.label,
            desc: `${item.module} · ${item.sublabel || item.status || ''}`,
            to: item.url,
            icon: getBusinessIcon(item.type),
            group: item.module,
            keywords: [item.type],
            source: 'business' as const,
            entityType: item.type,
            status: item.status,
          }))
        } else {
          businessResults.value = []
        }
      } catch {
        businessResults.value = []
      } finally {
        businessLoading.value = false
      }
    }, 200)
  })

  // 合并结果：导航 + 业务数据
  const allResults = computed(() => {
    const nav = searchNav(query.value)
    const biz = businessResults.value
    return [...nav.slice(0, 5), ...biz.slice(0, 5)]
  })

  function reset() {
    query.value = ''
    open.value = false
    selectedIndex.value = -1
    businessResults.value = []
  }

  function onSelect(item: SearchItem) {
    reset()
    navigateTo(item.to)
  }

  function selectFirst() {
    const first = allResults.value[0]
    if (first) onSelect(first)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, allResults.value.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = selectedIndex.value
      const item = allResults.value[idx]
      if (item) {
        onSelect(item)
      } else {
        selectFirst()
      }
    } else if (e.key === 'Escape') {
      reset()
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      open.value = true
      nextTick(() => inputRef.value?.focus())
    }
  }

  return { query, results: allResults, open, selectedIndex, inputRef, businessLoading, onSelect, selectFirst, handleKeydown, handleGlobalKeydown }
}

export function useTheme() {
  function init() {
    current.value = getSavedTheme()
    apply()
  }

  function getSavedTheme(): ThemeName {
    if (import.meta.server) return 'warm'
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'warm' || saved === 'blue') return saved
    } catch { /* ignore */ }
    return 'warm'
  }

  function setTheme(name: ThemeName) {
    current.value = name
    try { localStorage.setItem(STORAGE_KEY, name) } catch { /* ignore */ }
    apply()
  }

  function apply() {
    if (import.meta.server) return
    const root = document.documentElement
    root.classList.remove('theme-blue', 'theme-warm')
    root.classList.add(`theme-${current.value}`)
  }

  return {
    name: readonly(current),
    setTheme,
    init,
    isBlue: computed(() => current.value === 'blue'),
    isWarm: computed(() => current.value === 'warm'),
  }
}
