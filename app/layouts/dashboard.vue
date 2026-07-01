<script setup lang="ts">
const authStore = useAuthStore()
const { can } = usePermission()
const notificationStore = useNotificationStore()
const watermarkStore = useWatermarkStore()
const router = useRouter()
const route = useRoute()
const { setTheme, name: themeName } = useTheme()
const { query, results, open, selectedIndex, inputRef, businessLoading, onSelect, handleKeydown, handleGlobalKeydown } = useGlobalSearch()

const showNotificationPanel = ref(false)
const panelNotifications = ref<any[]>([])
const panelLoading = ref(false)

const sidebarCollapsed = ref(false)
const collapsedGroups = reactive<Record<string, boolean>>({})

function toggleGroup(key: string) {
  collapsedGroups[key] = !collapsedGroups[key]
}

function isItemActive(item: SidebarItem): boolean {
  if (!item.to) return false
  if (item.exact) return route.path === item.to
  const matched = route.path === item.to || route.path.startsWith(item.to)
  return matched
}

async function loadPanelNotifications() {
  panelLoading.value = true
  try {
    const result = await notificationStore.fetchNotifications(1)
    panelNotifications.value = (result as any)?.items || []
    notificationStore.fetchUnreadCount()
  } finally { panelLoading.value = false }
}

async function handleNotificationClick(notif: any) {
  if (!notif.isRead) { await notificationStore.markAsRead(notif.id) }
  showNotificationPanel.value = false
  const link = notificationStore.getNotificationLink(notif)
  if (link) router.push(link)
}

async function handleMarkAllRead() {
  await notificationStore.markAllAsRead()
  panelNotifications.value.forEach(n => n.isRead = true)
}

const sidebarOrder = ref<Record<string, number>>({})

onMounted(async () => {
  const saved = localStorage.getItem('sidebar-collapsed')
  if (saved !== null) sidebarCollapsed.value = saved === 'true'
  notificationStore.startPolling()
  loadSystemConfig()
  window.addEventListener('keydown', handleGlobalKeydown)
  try {
    const res = await $fetch('/api/system/config', { headers: { Authorization: `Bearer ${authStore.accessToken}` } }) as any
    if (res?.code === 0 && res.data?.sidebar_order) {
      try { sidebarOrder.value = JSON.parse(res.data.sidebar_order) } catch { }
    }
  } catch { }
})

watch(sidebarCollapsed, (val) => {
  localStorage.setItem('sidebar-collapsed', String(val))
})
onUnmounted(() => { notificationStore.stopPolling(); window.removeEventListener('keydown', handleGlobalKeydown) })

// 系统配置
const systemConfig = ref<any>({})
const logoUrl = ref('')
async function loadSystemConfig() {
  try {
    const res = await $fetch('/api/system/config', { headers: { Authorization: `Bearer ${authStore.accessToken}` } }) as any
    if (res?.code === 0) {
      systemConfig.value = res.data || {}
      watermarkStore.loadFromSystemConfig(res.data || {})
      if (systemConfig.value.company_logo) {
        logoUrl.value = '/api/attachments/logo?token=' + authStore.accessToken
      }
    }
  } catch { /* ignore */ }
}
const systemName = computed(() => systemConfig.value.system_name || '一体化管理')

// 水印
const showWatermark = computed(() => {
  if (watermarkStore.config.mode === 'global') return true
  if (watermarkStore.config.mode === 'page') return !!(router.currentRoute.value.meta.watermark as boolean)
  return false
})

interface SidebarItem {
  label: string
  icon?: string
  to?: string
  exact?: boolean
  sort?: number
  hidden?: boolean
  children?: SidebarItem[]
}

interface SidebarGroup {
  key: string
  label: string
  items: SidebarItem[]
}

const sidebarGroups = computed<SidebarGroup[]>(() => {
  const configSort = (key: string) => sidebarOrder.value[key] ?? 99

  const groups: SidebarGroup[] = [
    {
      key: 'crm',
      label: '客户经营',
      items: [
        { label: '客户', icon: 'i-lucide-users', to: '/dashboard/customers', sort: configSort('customers') !== 99 ? configSort('customers') : 0 },
        { label: '商机', icon: 'i-lucide-flag', to: '/dashboard/opportunities', sort: configSort('opportunities') !== 99 ? configSort('opportunities') : 2 },
      ],
    },
    {
      key: 'contracts',
      label: '合同中心',
      items: [
        { label: '合同中心', icon: 'i-lucide-layout-dashboard', to: '/dashboard/contracts/center', sort: configSort('contract_center') !== 99 ? configSort('contract_center') : 0 },
        { label: '合同列表', icon: 'i-lucide-file-text', to: '/dashboard/contracts', sort: configSort('contracts') !== 99 ? configSort('contracts') : 1 },
        { label: '合同台账', icon: 'i-lucide-table', to: '/dashboard/contracts/ledger', sort: configSort('contract_ledger') !== 99 ? configSort('contract_ledger') : 2 },
        { label: '模板管理', icon: 'i-lucide-layers', to: '/dashboard/contracts/templates', sort: configSort('contract_templates') !== 99 ? configSort('contract_templates') : 3 },
      ],
    },
    {
      key: 'project',
      label: '项目',
      items: [
        {
          label: '项目管理', icon: 'i-lucide-folder-open', to: '/dashboard/projects', sort: configSort('projects') !== 99 ? configSort('projects') : 0,
        },
      ],
    },
    {
      key: 'inventory',
      label: '进销存',
      items: [
        { label: '产品', icon: 'i-lucide-tag', to: '/dashboard/products', sort: configSort('products') !== 99 ? configSort('products') : 0 },
        { label: '采购', icon: 'i-lucide-shopping-cart', to: '/dashboard/purchases', sort: configSort('purchases') !== 99 ? configSort('purchases') : 1 },
        { label: '销售', icon: 'i-lucide-trending-up', to: '/dashboard/sales', sort: configSort('sales') !== 99 ? configSort('sales') : 2 },
        { label: '库存', icon: 'i-lucide-package', to: '/dashboard/inventory', sort: configSort('inventory') !== 99 ? configSort('inventory') : 3, hidden: !can('product:read') },
        { label: '仓库', icon: 'i-lucide-warehouse', to: '/dashboard/warehouses', sort: configSort('warehouses') !== 99 ? configSort('warehouses') : 4, hidden: !can('product:read') },
        { label: '供应商', icon: 'i-lucide-building-2', to: '/dashboard/suppliers', sort: configSort('suppliers') !== 99 ? configSort('suppliers') : 5 },
      ],
    },
    {
      key: 'finance',
      label: '财务',
      items: (() => {
        const items: SidebarItem[] = [
          {
            label: '财务', icon: 'i-lucide-dollar-sign', to: '/dashboard/finance', sort: configSort('finance') !== 99 ? configSort('finance') : 0, hidden: !can('finance:read'),
          },
          { label: '提成', icon: 'i-lucide-wallet', to: '/dashboard/commissions', sort: configSort('commissions') !== 99 ? configSort('commissions') : 1 },
          { label: '应收总账', icon: 'i-lucide-scale', to: '/dashboard/finance/ar', sort: configSort('ar') !== 99 ? configSort('ar') : 3, hidden: !can('finance:read') },
          { label: '客户对账', icon: 'i-lucide-file-check-2', to: '/dashboard/finance/reconciliations', sort: configSort('reconciliations') !== 99 ? configSort('reconciliations') : 4, hidden: !can('finance:read') },
        ]
        return items
      })(),
    },
  ]

  // 对每组内可见项排序
  return groups.map(g => ({
    ...g,
    items: g.items
      .filter(item => !item.hidden)
      .sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99)),
  })).filter(g => g.items.length > 0)
})

const userMenuItems = computed(() => [
  [{ label: authStore.user?.name || '未登录', slot: 'account', disabled: true }],
  [{ label: '个人中心', icon: 'i-lucide-user', to: '/dashboard/profile' }],
  [{ label: '退出登录', icon: 'i-lucide-log-out', onSelect: () => authStore.logout() }],
])

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = { remind: 'i-lucide-alarm-clock', approval: 'i-lucide-check-circle', commission: 'i-lucide-coins', system: 'i-lucide-info' }
  return icons[type] || 'i-lucide-bell'
}
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr); const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return diffMin + '分钟前'
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return diffHour + '小时前'
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return diffDay + '天前'
  return dateStr.slice(0, 10)
}
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <div class="flex h-screen overflow-hidden bg-surface-page">
      <!-- 侧边栏 -->
      <aside :class="[sidebarCollapsed ? 'w-16' : 'w-60', 'shrink-0 border-r border-line bg-surface-card flex flex-col transition-all duration-300']">
        <div class="h-14 flex items-center gap-2 px-3 border-b border-line-light" :class="sidebarCollapsed ? 'justify-center' : 'px-5'">
          <NuxtLink to="/dashboard" class="flex items-center gap-2 hover:opacity-80 transition-opacity" :class="sidebarCollapsed ? 'justify-center' : ''">
            <div v-if="logoUrl" class="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0">
              <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain" />
            </div>
            <div v-else class="w-8 h-8 rounded-md bg-brand-600 flex items-center justify-center shrink-0">
              <span class="text-white text-sm font-medium">E</span>
            </div>
            <span v-show="!sidebarCollapsed" class="text-sm font-medium text-content-primary truncate">{{ systemName }}</span>
          </NuxtLink>
        </div>

        <nav class="flex-1 overflow-y-auto py-3 px-3">
          <!-- 首页 / 待办 / 畅聊 / 消息 / 审批 — 无分组标题，始终显示 -->
          <ul class="space-y-0.5 mb-2">
            <li>
              <NuxtLink
                to="/dashboard"
                :title="sidebarCollapsed ? '首页' : undefined"
                :class="['flex items-center rounded-md text-sm transition-all', sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path === '/dashboard' ? 'bg-brand-50 text-brand-600 font-medium' : '']"
              >
                <UIcon name="i-lucide-home" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!sidebarCollapsed" class="truncate">首页</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/dashboard/todos"
                :title="sidebarCollapsed ? '待办' : undefined"
                :class="['flex items-center rounded-md text-sm transition-all', sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path === '/dashboard/todos' || route.path.startsWith('/dashboard/todos') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
              >
                <UIcon name="i-lucide-list-checks" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!sidebarCollapsed" class="truncate">待办</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/dashboard/notifications"
                :title="sidebarCollapsed ? '消息' : undefined"
                :class="['flex items-center rounded-md text-sm transition-all', sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path.startsWith('/dashboard/notifications') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
              >
                <UIcon name="i-lucide-bell" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!sidebarCollapsed" class="truncate">消息</span>
              </NuxtLink>
            </li>
          </ul>

          <div class="border-t border-line-light my-2" />

          <!-- 分组菜单 -->
          <div v-for="group in sidebarGroups" :key="group.key">
            <!-- 分组标题 -->
            <button
              v-show="!sidebarCollapsed"
              class="w-full flex items-center gap-1 text-[11px] text-content-muted font-medium tracking-wide uppercase py-2 px-3 hover:text-content-secondary transition-colors"
              @click="toggleGroup(group.key)"
            >
              <UIcon
                :name="collapsedGroups[group.key] ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                class="w-3 h-3 shrink-0"
              />
              {{ group.label }}
            </button>
            <!-- 分组标识：收起时只显示一条分割线 -->
            <div v-show="sidebarCollapsed" class="border-t border-line-light my-2 mx-2" />

            <!-- 菜单项 -->
            <ul v-show="sidebarCollapsed || !collapsedGroups[group.key]" class="space-y-0.5">
              <template v-for="(item, idx) in group.items" :key="idx">
                <li>
                  <NuxtLink
                    :to="item.to!"
                    :title="sidebarCollapsed ? item.label : undefined"
                    :class="[
                      'flex items-center rounded-md text-sm transition-all',
                      sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
                      'text-content-secondary hover:bg-brand-50 hover:text-brand-600',
                      isItemActive(item)
                        ? 'bg-brand-50 text-brand-600 font-medium' : ''
                    ]"
                  >
                    <UIcon v-if="item.icon" :name="item.icon" class="w-[18px] h-[18px] shrink-0" />
                    <span v-show="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
                  </NuxtLink>
                </li>
                <!-- 二级子项 -->
                <template v-if="item.children && !sidebarCollapsed && (!collapsedGroups[group.key])">
                  <li v-for="(child, cIdx) in item.children" :key="'c-' + cIdx">
                    <NuxtLink
                      :to="child.to!"
                      :class="[
                        'flex items-center rounded-md text-sm transition-all gap-3 pl-10 py-1.5',
                        'text-content-muted hover:bg-brand-50 hover:text-brand-600',
                        $route.path === child.to || $route.path.startsWith(child.to!) ? 'text-brand-600' : ''
                      ]"
                    >
                      <span class="text-xs truncate">{{ child.label }}</span>
                    </NuxtLink>
                  </li>
                </template>
              </template>
            </ul>
          </div>

          <div class="border-t border-line-light my-2" />

          <!-- 管理：同事 / 设置 / 报表 / 操作记录 -->
          <ul class="space-y-0.5">
            <li v-if="can('user:read')">
              <NuxtLink
                to="/dashboard/users"
                :title="sidebarCollapsed ? '同事' : undefined"
                :class="['flex items-center rounded-md text-sm transition-all', sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path.startsWith('/dashboard/users') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
              >
                <UIcon name="i-lucide-user-round-plus" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!sidebarCollapsed" class="truncate">同事</span>
              </NuxtLink>
            </li>
            <li v-if="can('user:read')">
              <NuxtLink
                to="/dashboard/settings"
                :title="sidebarCollapsed ? '设置' : undefined"
                :class="['flex items-center rounded-md text-sm transition-all', sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2', 'text-content-secondary hover:bg-brand-50 hover:text-brand-600', route.path.startsWith('/dashboard/settings') ? 'bg-brand-50 text-brand-600 font-medium' : '']"
              >
                <UIcon name="i-lucide-settings" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!sidebarCollapsed" class="truncate">设置</span>
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="border-t border-line-light p-3">
          <UDropdownMenu :items="userMenuItems" :popper="{ placement: 'top' }">
            <button :class="[sidebarCollapsed ? 'justify-center' : '', 'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors text-left']">
              <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span class="text-brand-700 text-xs font-medium">{{ authStore.user?.name?.charAt(0) || '?' }}</span>
              </div>
              <div v-show="!sidebarCollapsed" class="flex-1 min-w-0">
                <p class="text-sm text-content-primary truncate">{{ authStore.user?.name || '未登录' }}</p>
                <p class="text-xs text-content-muted truncate">{{ authStore.roleLabel }}</p>
              </div>
            </button>
          </UDropdownMenu>
          <button
            @click="sidebarCollapsed = !sidebarCollapsed"
            :class="[
              'w-full flex items-center rounded-md text-sm transition-colors mt-1',
              sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
              'text-content-muted hover:bg-brand-50 hover:text-brand-600'
            ]"
            :title="sidebarCollapsed ? '展开菜单' : '收起菜单'"
          >
            <UIcon :name="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="w-[18px] h-[18px] shrink-0" />
            <span v-show="!sidebarCollapsed" class="truncate">收起菜单</span>
          </button>
        </div>
      </aside>

      <!-- 主内容区 -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- 顶部栏 -->
        <header class="h-14 shrink-0 flex items-center justify-between px-6 border-b border-line bg-surface-card">
          <div class="flex items-center gap-2 text-sm text-content-muted">
            <NuxtLink to="/dashboard" class="hover:text-brand-600 transition-colors">首页</NuxtLink>
            <template v-if="$route.path !== '/dashboard'">
              <span class="text-content-muted">/</span>
              <span class="text-content-secondary">{{ $route.meta.title || '' }}</span>
            </template>
          </div>

          <!-- 全局搜索 -->
          <div class="relative flex-1 max-w-lg mx-8">
            <div class="relative">
              <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                :placeholder="navigator?.platform?.includes('Mac') ? '搜索... (⌘K)' : '搜索... (Ctrl+K)'"
                class="w-full pl-9 pr-10 py-1.5 text-sm rounded-md border border-line bg-surface-hover focus-ring focus:bg-surface-card transition-all placeholder:text-content-muted"
                @focus="open = true"
                @blur="open = false"
                @keydown="handleKeydown"
              />
              <kbd v-if="!query" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-content-muted bg-surface-hover px-1.5 py-0.5 rounded-md">{{ navigator?.platform?.includes('Mac') ? '⌘K' : 'Ctrl+K' }}</kbd>
            </div>
            <!-- 下拉面板 -->
            <div v-if="open && query.trim()" class="absolute top-full mt-1.5 w-full bg-surface-card border border-line rounded-xl shadow-lg z-50 overflow-hidden">
              <!-- 加载中 -->
              <div v-if="businessLoading && results.length === 0" class="px-4 py-6 space-y-3">
                <div v-for="i in 3" :key="i" class="flex items-center gap-3">
                  <div class="w-4 h-4 rounded bg-surface-hover" />
                  <div class="flex-1 space-y-1.5">
                    <div class="h-3 bg-surface-hover rounded w-2/3" />
                    <div class="h-2 bg-surface-hover rounded w-1/2" />
                  </div>
                </div>
              </div>
              <!-- 空结果 -->
              <div v-else-if="results.length === 0" class="px-4 py-6 text-xs text-content-muted text-center">
                <UIcon name="i-lucide-search-x" class="w-5 h-5 text-content-muted mx-auto mb-2" />
                换个关键词试试？
              </div>
              <template v-else>
                <!-- 导航结果分区 -->
                <template v-for="(item, idx) in results" :key="(item as any).to">
                  <div v-if="(idx === 0 || (results[idx - 1] as any)?.group !== item.group) && (item as any).source !== 'business'" class="px-4 py-2 text-[10px] font-medium text-content-muted uppercase tracking-wide bg-surface-hover/50">
                    {{ item.group }}
                  </div>
                  <!-- 业务数据分隔线 -->
                  <div v-if="idx > 0 && (results[idx - 1] as any)?.source !== 'business' && (item as any).source === 'business'" class="px-4 py-2 text-[10px] font-medium text-content-muted uppercase tracking-wide bg-surface-hover/50 border-t border-line-light">
                    搜索结果
                  </div>
                  <button
                    class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-content-secondary hover:bg-surface-hover transition-colors text-left"
                    :class="{ 'bg-surface-hover': idx === selectedIndex }"
                    @mousedown.prevent="onSelect(item)"
                  >
                    <UIcon :name="item.icon" class="w-4 h-4 text-content-muted shrink-0" />
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium text-content-primary truncate">{{ item.label }}</p>
                        <span v-if="(item as any).status" class="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-hover text-content-muted shrink-0">{{ (item as any).status }}</span>
                      </div>
                      <p class="text-xs text-content-muted truncate">{{ item.desc }}</p>
                    </div>
                    <UIcon name="i-lucide-corner-down-left" class="w-3 h-3 text-content-muted ml-auto shrink-0" />
                  </button>
                </template>
              </template>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- 主题切换 -->
            <button
              @click="setTheme(themeName === 'blue' ? 'warm' : 'blue')"
              class="p-2 rounded-md text-content-muted hover:bg-surface-hover transition-colors"
              :title="themeName === 'blue' ? '切换暖色主题' : '切换蓝色主题'"
            >
              <UIcon :name="themeName === 'blue' ? 'i-lucide-sun' : 'i-lucide-moon'" class="w-5 h-5" />
            </button>

            <!-- 通知铃铛 + 下拉面板 -->
            <div class="relative">
              <button
                class="p-2 rounded-md text-content-muted hover:bg-surface-hover transition-colors relative"
                @click="showNotificationPanel = !showNotificationPanel; if (showNotificationPanel) loadPanelNotifications()"
              >
                <UIcon name="i-lucide-bell" class="w-5 h-5" />
                <span v-if="notificationStore.unreadCount > 0"
                  class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-0.5">
                  {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
                </span>
              </button>

              <!-- 下拉面板 -->
              <div v-if="showNotificationPanel" class="absolute right-0 top-full mt-2 w-80 bg-surface-card border border-line rounded-xl shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
                <div class="flex items-center justify-between px-4 py-3 border-b border-line-light">
                  <h3 class="text-sm font-medium text-content-secondary">消息通知</h3>
                  <div class="flex items-center gap-1">
                    <button class="text-xs text-content-muted hover:text-brand-600 transition-colors" @click="handleMarkAllRead">全部已读</button>
                    <NuxtLink to="/dashboard/notifications" class="text-xs text-content-muted hover:text-content-secondary transition-colors ml-1" @click="showNotificationPanel = false">查看全部</NuxtLink>
                  </div>
                </div>
                <div class="flex-1 overflow-y-auto">
                  <div v-if="panelLoading" class="text-center py-8 text-xs text-content-muted">加载中...</div>
                  <div v-else-if="panelNotifications.length === 0" class="text-center py-8">
                    <UIcon name="i-lucide-bell-off" class="w-6 h-6 text-content-muted mx-auto mb-2" />
                    <p class="text-xs text-content-muted">暂时没有通知</p>
                  </div>
                  <div v-else>
                    <button
                      v-for="notif in panelNotifications" :key="notif.id"
                      class="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors border-b border-line-light flex gap-3"
                      :class="{ 'bg-brand-50/30': !notif.isRead }"
                      @click="handleNotificationClick(notif)"
                    >
                      <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', notif.isRead ? 'bg-surface-hover' : 'bg-brand-100']">
                        <UIcon :name="getNotificationIcon(notif.type)" class="w-4 h-4" :class="notif.isRead ? 'text-content-muted' : 'text-brand-600'" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p :class="['text-sm truncate', notif.isRead ? 'text-content-muted' : 'text-content-primary font-medium']">{{ notif.title }}</p>
                        <p v-if="notif.content" class="text-xs text-content-muted mt-0.5 line-clamp-1">{{ notif.content }}</p>
                        <p class="text-[10px] text-content-muted mt-1">{{ formatTime(notif.createdAt) }}</p>
                      </div>
                      <div v-if="!notif.isRead" class="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- 页面内容 -->
        <main class="flex-1 overflow-y-auto p-6">
          <NuxtPage />
        </main>
      </div>
    </div>
    <Watermark
      v-if="showWatermark"
      :content="watermarkStore.config.content"
      :opacity="watermarkStore.config.opacity"
      :font-size="watermarkStore.config.fontSize"
      :rotate="watermarkStore.config.rotate"
      :color="watermarkStore.config.color"
      :gap="watermarkStore.config.gap"
    />
  </UApp>
</template>
