<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '首页', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const kpi = ref<Record<string, number>>({ customerTotal: 0, opportunityInProgress: 0, contractAmountThisMonth: 0, receivedAmountThisMonth: 0 })
const reminders = ref([{ label: '待跟进客户', count: 0, bgClass: 'bg-blue-50', textClass: 'text-blue-700', to: '/dashboard/customers' }, { label: '即将到期合同', count: 0, bgClass: 'bg-brand-50', textClass: 'text-brand-700', to: '/dashboard/contracts' }, { label: '待完成任务', count: 0, bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', to: '/dashboard/todos' }])
const recentCustomers = ref<any[]>([])
const recentOpportunities = ref<any[]>([])
const funnelData = ref({ stages: [] as any[], total: 0 })
const loading = ref(true)

const { getLabel } = useEnum()

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN') }
function formatPercent(v: number, total: number) { if (!total) return '0%'; return Math.round(v / total * 100) + '%' }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await $api('/api/dashboard')
    if (res?.code === 0) {
      kpi.value = res.data.kpi
      reminders.value = [
        { label: '待跟进客户', count: res.data.todayReminders.followUps, bgClass: 'bg-blue-50', textClass: 'text-blue-700', to: '/dashboard/customers' },
        { label: '即将到期合同', count: res.data.todayReminders.expiringContracts, bgClass: 'bg-brand-50', textClass: 'text-brand-700', to: '/dashboard/contracts' },
        { label: '待完成任务', count: res.data.todayReminders.dueTasks, bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', to: '/dashboard/todos' },
      ]
      recentCustomers.value = res.data.recentCustomers || []
      recentOpportunities.value = res.data.recentOpportunities || []
      funnelData.value = res.data.funnelData || { stages: [], total: 0 }
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

const kpiItems = computed(() => [
  { label: '客户总数', value: kpi.value.customerTotal ?? 0, icon: 'i-lucide-users', colorClass: 'text-blue-500', bgClass: 'bg-blue-50', to: '/dashboard/customers' },
  { label: '本月新增客户', value: kpi.value.newCustomersThisMonth ?? 0, icon: 'i-lucide-user-plus', colorClass: 'text-sky-500', bgClass: 'bg-sky-50', to: '/dashboard/customers' },
  { label: '进行中商机', value: kpi.value.opportunityInProgress ?? 0, icon: 'i-lucide-flag', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-50', to: '/dashboard/opportunities' },
  { label: '本月新增商机', value: kpi.value.newOppsThisMonth ?? 0, icon: 'i-lucide-plus-circle', colorClass: 'text-violet-500', bgClass: 'bg-violet-50', to: '/dashboard/opportunities' },
  { label: '总商机金额', value: formatMoney(kpi.value.oppTotalAmount ?? 0), icon: 'i-lucide-trending-up', colorClass: 'text-blue-600', bgClass: 'bg-blue-50', to: '/dashboard/opportunities' },
  { label: '本月合同成交额', value: formatMoney(kpi.value.contractClosedThisMonth ?? 0), icon: 'i-lucide-file-check', colorClass: 'text-teal-600', bgClass: 'bg-teal-50', to: '/dashboard/contracts' },
  { label: '待回款总额', value: formatMoney(kpi.value.invoicedUnpaid ?? 0), icon: 'i-lucide-clock', colorClass: 'text-red-500', bgClass: 'bg-red-50', to: '/dashboard/finance' },
  { label: '已回款总额', value: formatMoney(kpi.value.totalCollection ?? 0), icon: 'i-lucide-dollar-sign', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50', to: '/dashboard/finance' },
  { label: '提成总金额', value: formatMoney(kpi.value.commissionTotal ?? 0), icon: 'i-lucide-banknote', colorClass: 'text-purple-500', bgClass: 'bg-purple-50', to: '/dashboard/commissions' },
  { label: '未发放提成', value: formatMoney(kpi.value.commissionUnpaid ?? 0), icon: 'i-lucide-hour-glass', colorClass: 'text-brand-600', bgClass: 'bg-brand-50', to: '/dashboard/commissions' },
  { label: '已发放提成', value: formatMoney(kpi.value.commissionPaid ?? 0), icon: 'i-lucide-badge-check', colorClass: 'text-green-600', bgClass: 'bg-green-50', to: '/dashboard/commissions' },
  { label: '本月合同额', value: formatMoney(kpi.value.contractAmountThisMonth ?? 0), icon: 'i-lucide-file-text', colorClass: 'text-cyan-600', bgClass: 'bg-cyan-50', to: '/dashboard/contracts' },
])

onMounted(() => fetchData())

interface ShortcutItem { key: string; label: string; icon: string; to: string; bgClass: string; colorClass: string }

const allShortcuts: ShortcutItem[] = [
  { key: 'customers', label: '客户', icon: 'i-lucide-users', to: '/dashboard/customers', bgClass: 'bg-blue-50', colorClass: 'text-blue-600' },
  { key: 'opportunities', label: '商机', icon: 'i-lucide-flag', to: '/dashboard/opportunities', bgClass: 'bg-indigo-50', colorClass: 'text-indigo-600' },
  { key: 'contracts', label: '合同', icon: 'i-lucide-file-text', to: '/dashboard/contracts', bgClass: 'bg-violet-50', colorClass: 'text-violet-600' },
  { key: 'projects', label: '项目', icon: 'i-lucide-folder-open', to: '/dashboard/projects', bgClass: 'bg-sky-50', colorClass: 'text-sky-600' },
  { key: 'products', label: '产品', icon: 'i-lucide-tag', to: '/dashboard/products', bgClass: 'bg-teal-50', colorClass: 'text-teal-600' },
  { key: 'commissions', label: '提成', icon: 'i-lucide-wallet', to: '/dashboard/commissions', bgClass: 'bg-emerald-50', colorClass: 'text-emerald-600' },
  { key: 'finance', label: '财务', icon: 'i-lucide-dollar-sign', to: '/dashboard/finance', bgClass: 'bg-green-50', colorClass: 'text-green-600' },
  { key: 'im', label: '畅聊', icon: 'i-lucide-message-circle', to: '/dashboard/im', bgClass: 'bg-rose-50', colorClass: 'text-rose-500' },
]

const STORAGE_KEY = 'dashboard-shortcuts'
const defaultKeys = ['customers', 'opportunities', 'contracts', 'projects', 'todos']

const pinnedKeys = ref<string[]>([])
const isEditingShortcuts = ref(false)

function loadShortcuts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    pinnedKeys.value = saved ? JSON.parse(saved) : [...defaultKeys]
  } catch { pinnedKeys.value = [...defaultKeys] }
}
function saveShortcuts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedKeys.value)) }
function toggleShortcut(key: string) {
  const idx = pinnedKeys.value.indexOf(key)
  if (idx >= 0) {
    if (pinnedKeys.value.length <= 1) { toast.add({ title: '至少保留一个快捷入口', color: 'warning' }); return }
    pinnedKeys.value.splice(idx, 1)
  } else { pinnedKeys.value.push(key) }
  saveShortcuts()
}
const pinnedShortcuts = computed(() => pinnedKeys.value.map(key => {
  if (key === 'todos') return { key: 'todos', label: '待办', icon: 'i-lucide-list-checks', to: '/dashboard/todos', bgClass: 'bg-green-50', colorClass: 'text-green-600' }
  return allShortcuts.find(s => s.key === key)
}).filter(Boolean) as ShortcutItem[])

onMounted(() => {
  loadShortcuts()
})
</script>

<template>
  <div v-if="loading" class="text-center py-12">
    <div class="inline-flex items-center gap-2 text-gray-400">
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
      <span class="text-sm">马上就好...</span>
    </div>
  </div>

  <div v-else>
    <div class="mb-8">
      <h1 class="text-xl font-medium text-gray-900">首页</h1>
      <p class="text-sm text-gray-500 mt-1">看看今天有哪些事要处理</p>
    </div>

    <!-- 快捷入口 -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-gray-700">快捷入口</h3>
        <button @click="isEditingShortcuts = !isEditingShortcuts" class="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
          {{ isEditingShortcuts ? '完成' : '调整' }}
        </button>
      </div>
      <div v-if="isEditingShortcuts" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        <button v-for="item in allShortcuts" :key="item.key" @click="toggleShortcut(item.key)"
          :class="['flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
            pinnedKeys.includes(item.key) ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-gray-100 opacity-50 hover:opacity-75 hover:border-gray-200']">
          <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', item.bgClass]"><UIcon :name="item.icon" :class="['w-4 h-4', item.colorClass]" /></div>
          <span class="text-[11px] text-gray-600">{{ item.label }}</span>
          <UIcon v-if="pinnedKeys.includes(item.key)" name="i-lucide-check-circle-2" class="w-3.5 h-3.5 text-blue-500" />
          <div v-else class="w-3.5 h-3.5 rounded-full border border-gray-200" />
        </button>
        <button @click="toggleShortcut('todos')"
          :class="['flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
            pinnedKeys.includes('todos') ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-gray-100 opacity-50 hover:opacity-75 hover:border-gray-200']">
          <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><UIcon name="i-lucide-list-checks" class="w-4 h-4 text-green-600" /></div>
          <span class="text-[11px] text-gray-600">待办</span>
          <UIcon v-if="pinnedKeys.includes('todos')" name="i-lucide-check-circle-2" class="w-3.5 h-3.5 text-blue-500" />
          <div v-else class="w-3.5 h-3.5 rounded-full border border-gray-200" />
        </button>
      </div>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        <NuxtLink v-for="item in pinnedShortcuts" :key="item.key" :to="item.to" class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all group">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm', item.bgClass]">
            <UIcon :name="item.icon" :class="['w-5 h-5', item.colorClass]" />
          </div>
          <span class="text-xs text-gray-600 group-hover:text-gray-900">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <DashboardKpiCards :items="kpiItems" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- 最近客户 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-700">最近添加的客户</h3>
          <NuxtLink to="/dashboard/customers" class="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">查看全部 →</NuxtLink>
        </div>
        <div v-if="recentCustomers.length === 0" class="text-xs text-gray-400 py-8 text-center">还没有客户，加一个？</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="c in recentCustomers" :key="c.id" :to="`/dashboard/customers/${c.id}`" class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span class="text-blue-600 text-xs font-medium">{{ c.name?.charAt(0) }}</span>
              </div>
              <div class="min-w-0">
                <p class="text-sm text-gray-900 truncate">{{ c.name }}</p>
                <p class="text-xs text-gray-400">{{ c.industry || '未分类' }}</p>
              </div>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0">{{ (c.createdAt || '').slice(0, 10) }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- 最近商机 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-700">最近商机</h3>
          <NuxtLink to="/dashboard/opportunities" class="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">查看全部 →</NuxtLink>
        </div>
        <div v-if="recentOpportunities.length === 0" class="text-xs text-gray-400 py-8 text-center">还没有商机，创建一个？</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="o in recentOpportunities" :key="o.id" :to="`/dashboard/opportunities/${o.id}`" class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-lucide-flag" class="w-4 h-4 text-indigo-400" />
              </div>
              <div class="min-w-0">
                <p class="text-sm text-gray-900 truncate">{{ o.name }}</p>
                <p class="text-xs text-gray-400">{{ getLabel('OpportunityStatus', o.status) || o.status }}</p>
              </div>
            </div>
            <span class="text-sm text-gray-700 font-medium flex-shrink-0">{{ formatMoney(o.amount) }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- 提醒 + 销售漏斗 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 今日提醒 -->
      <DashboardReminderList :items="reminders" />

      <!-- 销售漏斗 -->
      <div class="card">
        <h3 class="text-sm font-medium text-gray-700 mb-4">
          销售漏斗
          <span class="text-xs text-gray-400 ml-2">共 {{ funnelData.total }} 个商机</span>
        </h3>
        <div v-if="funnelData.stages.length === 0" class="text-xs text-gray-400 py-8 text-center">暂无数据</div>
        <div v-else class="space-y-2.5">
          <div v-for="stage in funnelData.stages" :key="stage.status" class="flex items-center gap-3">
            <span class="text-xs text-gray-600 w-16 flex-shrink-0">{{ getLabel('OpportunityStatus', stage.status) || stage.status }}</span>
            <div class="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full transition-all" :style="{ width: formatPercent(Number(stage.count), funnelData.total) }" />
            </div>
            <span class="text-xs text-gray-500 w-12 text-right">{{ stage.count }} 个</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
