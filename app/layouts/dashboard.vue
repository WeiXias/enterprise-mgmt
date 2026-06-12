<script setup lang="ts">
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const imStore = useIMStore()
const router = useRouter()

const showNotificationPanel = ref(false)
const panelNotifications = ref<any[]>([])
const panelLoading = ref(false)

const sidebarCollapsed = ref(false)

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
  imStore.startPolling()
  loadSystemConfig()
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
onUnmounted(() => { notificationStore.stopPolling(); imStore.stopAllPolling() })

// 系统配置
const systemConfig = ref<any>({})
const logoUrl = ref('')
async function loadSystemConfig() {
  try {
    const res = await $fetch('/api/system/config', { headers: { Authorization: `Bearer ${authStore.accessToken}` } }) as any
    if (res?.code === 0) {
      systemConfig.value = res.data || {}
      if (systemConfig.value.company_logo) {
        logoUrl.value = '/api/files/logo?token=' + authStore.accessToken
      }
    }
  } catch { /* ignore */ }
}
const systemName = computed(() => systemConfig.value.system_name || '一体化管理')

const sidebarItems = computed(() => {
  const configSort = (key: string) => sidebarOrder.value[key] ?? 99
  const items: any[] = [
    { label: '首页', icon: 'i-lucide-home', to: '/dashboard', exact: true, sort: configSort('home') !== 99 ? configSort('home') : 0 },
    { label: '待办', icon: 'i-lucide-list-checks', to: '/dashboard/todos', sort: configSort('todos') !== 99 ? configSort('todos') : 1 },
    { label: '客户', icon: 'i-lucide-users', to: '/dashboard/customers', sort: configSort('customers') !== 99 ? configSort('customers') : 2 },
    { label: '商机', icon: 'i-lucide-flag', to: '/dashboard/opportunities', sort: configSort('opportunities') !== 99 ? configSort('opportunities') : 2 },
    { label: '产品', icon: 'i-lucide-tag', to: '/dashboard/products', sort: configSort('products') !== 99 ? configSort('products') : 3 },
    { label: '合同', icon: 'i-lucide-file-text', to: '/dashboard/contracts', sort: configSort('contracts') !== 99 ? configSort('contracts') : 4 },
    { label: '分包合同', icon: 'i-lucide-share-2', to: '/dashboard/contracts/subcontracts', sort: configSort('subcontracts') !== 99 ? configSort('subcontracts') : 45 },
    { label: '项目', icon: 'i-lucide-folder-open', to: '/dashboard/projects', sort: configSort('projects') !== 99 ? configSort('projects') : 5 },
  ]
  if (authStore.isAdmin || authStore.isSalesManager) {
    items.push({ label: '库存', icon: 'i-lucide-package', to: '/dashboard/inventory', sort: configSort('inventory') !== 99 ? configSort('inventory') : 6 })
  }
  items.push({ label: '提成', icon: 'i-lucide-wallet', to: '/dashboard/commissions', sort: configSort('commissions') !== 99 ? configSort('commissions') : 7 })
  items.push({ label: '畅聊', icon: 'i-lucide-message-circle', to: '/dashboard/im', sort: configSort('im') !== 99 ? configSort('im') : 8 })
  items.push({ label: '消息', icon: 'i-lucide-bell', to: '/dashboard/notifications', sort: configSort('notifications') !== 99 ? configSort('notifications') : 9 })
  if (authStore.isFinance || authStore.isAdmin) {
    items.push({ label: '财务', icon: 'i-lucide-dollar-sign', to: '/dashboard/finance', sort: configSort('finance') !== 99 ? configSort('finance') : 10 })
  }
  if (authStore.isAdmin) {
    items.push(
      { type: 'separator' as const },
      { label: '同事', icon: 'i-lucide-user-round-plus', to: '/dashboard/users' },
      { label: '设置', icon: 'i-lucide-settings', to: '/dashboard/settings' },
      { label: '操作记录', icon: 'i-lucide-clock', to: '/dashboard/logs' },
    )
  }
  return items.sort((a, b) => (a.sort ?? 99) - (b.sort ?? 99))
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
    <div class="flex h-screen overflow-hidden bg-[var(--color-bg-warm)]">
      <!-- 侧边栏 -->
      <aside :class="[sidebarCollapsed ? 'w-16' : 'w-60', 'shrink-0 border-r border-[var(--color-border-warm)] bg-white flex flex-col transition-all duration-300']">
        <div class="h-14 flex items-center gap-2 px-3 border-b border-[var(--color-border-warm)]" :class="sidebarCollapsed ? 'justify-center' : 'px-5'">
          <NuxtLink to="/dashboard" class="flex items-center gap-2 hover:opacity-80 transition-opacity" :class="sidebarCollapsed ? 'justify-center' : ''">
            <div v-if="logoUrl" class="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
              <img :src="logoUrl" alt="Logo" class="w-full h-full object-contain" />
            </div>
            <div v-else class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <span class="text-white text-sm font-medium">E</span>
            </div>
            <span v-show="!sidebarCollapsed" class="text-sm font-medium text-stone-800 truncate">{{ systemName }}</span>
          </NuxtLink>
        </div>

        <nav class="flex-1 overflow-y-auto py-3 px-3">
          <ul class="space-y-0.5">
            <li v-for="(item, index) in sidebarItems" :key="index">
              <div v-if="(item as any).type === 'separator'" class="my-2 border-t border-stone-100" />
              <NuxtLink
                v-else
                :to="item.to!"
                :title="sidebarCollapsed ? item.label : undefined"
                :class="[
                  'flex items-center rounded-lg text-sm transition-colors',
                  sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
                  'text-stone-600 hover:bg-amber-50 hover:text-amber-700',
                  $route.path === item.to || (!item.exact && $route.path.startsWith(item.to!))
                    ? 'bg-amber-50 text-amber-700 font-medium' : ''
                ]"
              >
                <UIcon :name="item.icon!" class="w-[18px] h-[18px] shrink-0" />
                <span v-show="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
              </NuxtLink>
            </li>
          </ul>
        </nav>

        <div class="border-t border-stone-100 p-3">
          <UDropdownMenu :items="userMenuItems" :popper="{ placement: 'top' }">
            <button :class="[sidebarCollapsed ? 'justify-center' : '', 'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors text-left']">
              <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span class="text-amber-700 text-xs font-medium">{{ authStore.user?.name?.charAt(0) || '?' }}</span>
              </div>
              <div v-show="!sidebarCollapsed" class="flex-1 min-w-0">
                <p class="text-sm text-stone-800 truncate">{{ authStore.user?.name || '未登录' }}</p>
                <p class="text-xs text-stone-400 truncate">{{ authStore.roleLabel }}</p>
              </div>
            </button>
          </UDropdownMenu>
          <button
            @click="sidebarCollapsed = !sidebarCollapsed"
            :class="[
              'w-full flex items-center rounded-lg text-sm transition-colors mt-1',
              sidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-3 py-2',
              'text-stone-400 hover:bg-amber-50 hover:text-amber-600'
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
        <div class="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[var(--color-border-warm)] bg-white">
          <div class="flex items-center gap-2 text-sm text-stone-500">
            <NuxtLink to="/dashboard" class="hover:text-amber-600 transition-colors">首页</NuxtLink>
            <template v-if="$route.path !== '/dashboard'">
              <span>/</span>
              <span class="text-stone-700">{{ $route.meta.title || '' }}</span>
            </template>
          </div>

          <div class="flex items-center gap-3">
            <!-- 通知铃铛（合并 IM + 系统通知） + 下拉面板 -->
            <div class="relative">
              <button
                class="p-2 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors relative"
                @click="showNotificationPanel = !showNotificationPanel; if (showNotificationPanel) loadPanelNotifications()"
              >
                <UIcon name="i-lucide-bell" class="w-5 h-5" />
                <span v-if="notificationStore.unreadCount + imStore.unreadTotal > 0"
                  class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-0.5">
                  {{ notificationStore.unreadCount + imStore.unreadTotal > 99 ? '99+' : notificationStore.unreadCount + imStore.unreadTotal }}
                </span>
              </button>

              <!-- 下拉面板 -->
              <div v-if="showNotificationPanel" class="absolute right-0 top-full mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                <div class="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                  <h3 class="text-sm font-medium text-stone-700">消息通知</h3>
                  <div class="flex items-center gap-1">
                    <NuxtLink to="/dashboard/im" class="text-xs text-amber-600 hover:text-amber-700 transition-colors" @click="showNotificationPanel = false">畅聊</NuxtLink>
                    <button class="text-xs text-stone-400 hover:text-amber-600 transition-colors" @click="handleMarkAllRead">全部已读</button>
                    <NuxtLink to="/dashboard/notifications" class="text-xs text-stone-400 hover:text-stone-600 transition-colors ml-1" @click="showNotificationPanel = false">查看全部</NuxtLink>
                  </div>
                </div>
                <div class="flex-1 overflow-y-auto">
                  <div v-if="panelLoading" class="text-center py-8 text-xs text-stone-400">加载中...</div>
                  <div v-else-if="panelNotifications.length === 0" class="text-center py-8">
                    <UIcon name="i-lucide-bell-off" class="w-6 h-6 text-stone-300 mx-auto mb-2" />
                    <p class="text-xs text-stone-400">暂时没有通知</p>
                  </div>
                  <div v-else>
                    <button
                      v-for="notif in panelNotifications" :key="notif.id"
                      class="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 flex gap-3"
                      :class="{ 'bg-amber-50/50': !notif.isRead }"
                      @click="handleNotificationClick(notif)"
                    >
                      <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', notif.isRead ? 'bg-stone-100' : 'bg-amber-100']">
                        <UIcon :name="getNotificationIcon(notif.type)" class="w-4 h-4" :class="notif.isRead ? 'text-stone-400' : 'text-amber-600'" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p :class="['text-sm truncate', notif.isRead ? 'text-stone-500' : 'text-stone-800 font-medium']">{{ notif.title }}</p>
                        <p v-if="notif.content" class="text-xs text-stone-400 mt-0.5 line-clamp-1">{{ notif.content }}</p>
                        <p class="text-[10px] text-stone-400 mt-1">{{ formatTime(notif.createdAt) }}</p>
                      </div>
                      <div v-if="!notif.isRead" class="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 页面内容 -->
        <main class="flex-1 overflow-y-auto p-6">
          <NuxtPage />
        </main>
      </div>
    </div>
  </UApp>
</template>
