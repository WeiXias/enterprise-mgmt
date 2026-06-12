<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '首页', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const kpi = ref({ customerTotal: 0, opportunityInProgress: 0, contractAmountThisMonth: 0, receivedAmountThisMonth: 0 })
const reminders = ref([{ label: '待跟进客户', count: 0, bgClass: 'bg-amber-50', textClass: 'text-amber-700', to: '/dashboard/customers' }, { label: '即将到期合同', count: 0, bgClass: 'bg-blue-50', textClass: 'text-blue-600', to: '/dashboard/contracts' }, { label: '待完成任务', count: 0, bgClass: 'bg-stone-100', textClass: 'text-stone-600', to: '/dashboard/todos' }])
const recentCustomers = ref<any[]>([])
const recentOpportunities = ref<any[]>([])
const funnelData = ref({ stages: [] as any[], total: 0 })
const loading = ref(true)

const oppStatusLabels: Record<string, string> = {
  initial_contact: '初步接触',
  requirement_confirmed: '需求确认',
  proposal_submitted: '方案提交',
  business_negotiation: '商务谈判',
  closed_won: '已成交',
  closed_lost: '已输单',
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN') }
function formatPercent(v: number, total: number) { if (!total) return '0%'; return Math.round(v / total * 100) + '%' }

async function fetchData() {
  loading.value = true
  try {
    const res = await $api('/api/dashboard') as any
    if (res?.code === 0) {
      kpi.value = res.data.kpi
      reminders.value = [
          { label: '待跟进客户', count: res.data.todayReminders.followUps, bgClass: 'bg-amber-50', textClass: 'text-amber-700', to: '/dashboard/customers' },
          { label: '即将到期合同', count: res.data.todayReminders.expiringContracts, bgClass: 'bg-blue-50', textClass: 'text-blue-600', to: '/dashboard/contracts' },
          { label: '待完成任务', count: res.data.todayReminders.dueTasks, bgClass: 'bg-stone-100', textClass: 'text-stone-600', to: '/dashboard/todos' },
        { label: '待跟进客户', count: res.data.todayReminders.followUps, bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
        { label: '即将到期合同', count: res.data.todayReminders.expiringContracts, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
        { label: '待完成任务', count: res.data.todayReminders.dueTasks, bgClass: 'bg-stone-100', textClass: 'text-stone-600' },
      ]
      recentCustomers.value = res.data.recentCustomers || []
      recentOpportunities.value = res.data.recentOpportunities || []
      funnelData.value = res.data.funnelData || { stages: [], total: 0 }
    }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

const kpiItems = computed(() => [
  { label: '客户总数', value: kpi.value.customerTotal, icon: 'i-lucide-users', colorClass: 'text-amber-500', bgClass: 'bg-amber-50' , to: '/dashboard/customers' },
  { label: '本月新增客户', value: kpi.value.newCustomersThisMonth, icon: 'i-lucide-user-plus', colorClass: 'text-orange-500', bgClass: 'bg-orange-50' , to: '/dashboard/customers' },
  { label: '进行中商机', value: kpi.value.opportunityInProgress, icon: 'i-lucide-flag', colorClass: 'text-blue-400', bgClass: 'bg-blue-50' , to: '/dashboard/opportunities' },
  { label: '本月新增商机', value: kpi.value.newOppsThisMonth, icon: 'i-lucide-plus-circle', colorClass: 'text-sky-500', bgClass: 'bg-sky-50' , to: '/dashboard/opportunities' },
  { label: '总商机金额', value: formatMoney(kpi.value.oppTotalAmount), icon: 'i-lucide-trending-up', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-50' , to: '/dashboard/opportunities' },
  { label: '本月合同成交额', value: formatMoney(kpi.value.contractClosedThisMonth), icon: 'i-lucide-file-check', colorClass: 'text-teal-600', bgClass: 'bg-teal-50' , to: '/dashboard/contracts' },
  { label: '待回款总额', value: formatMoney(kpi.value.invoicedUnpaid), icon: 'i-lucide-clock', colorClass: 'text-red-500', bgClass: 'bg-red-50' , to: '/dashboard/finance' },
  { label: '已回款总额', value: formatMoney(kpi.value.totalCollection), icon: 'i-lucide-dollar-sign', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-50' , to: '/dashboard/finance' },
  { label: '提成总金额', value: formatMoney(kpi.value.commissionTotal), icon: 'i-lucide-banknote', colorClass: 'text-violet-500', bgClass: 'bg-violet-50' , to: '/dashboard/commissions' },
  { label: '未发放提成', value: formatMoney(kpi.value.commissionUnpaid), icon: 'i-lucide-hour-glass', colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50' , to: '/dashboard/commissions' },
  { label: '已发放提成', value: formatMoney(kpi.value.commissionPaid), icon: 'i-lucide-badge-check', colorClass: 'text-green-600', bgClass: 'bg-green-50' , to: '/dashboard/commissions' },
  { label: '本月合同额', value: formatMoney(kpi.value.contractAmountThisMonth), icon: 'i-lucide-file-text', colorClass: 'text-cyan-600', bgClass: 'bg-cyan-50' , to: '/dashboard/contracts' },
])

onMounted(() => fetchData())

interface ShortcutItem { key: string; label: string; icon: string; to: string; bgClass: string; colorClass: string }

const allShortcuts: ShortcutItem[] = [
  { key: 'customers', label: '客户', icon: 'i-lucide-users', to: '/dashboard/customers', bgClass: 'bg-amber-50', colorClass: 'text-amber-600' },
  { key: 'opportunities', label: '商机', icon: 'i-lucide-flag', to: '/dashboard/opportunities', bgClass: 'bg-blue-50', colorClass: 'text-blue-500' },
  { key: 'contracts', label: '合同', icon: 'i-lucide-file-text', to: '/dashboard/contracts', bgClass: 'bg-violet-50', colorClass: 'text-violet-600' },
  { key: 'projects', label: '项目', icon: 'i-lucide-folder-open', to: '/dashboard/projects', bgClass: 'bg-sky-50', colorClass: 'text-sky-600' },
  { key: 'products', label: '产品', icon: 'i-lucide-tag', to: '/dashboard/products', bgClass: 'bg-teal-50', colorClass: 'text-teal-600' },
  { key: 'commissions', label: '提成', icon: 'i-lucide-wallet', to: '/dashboard/commissions', bgClass: 'bg-emerald-50', colorClass: 'text-emerald-600' },
  { key: 'finance', label: '财务', icon: 'i-lucide-dollar-sign', to: '/dashboard/finance', bgClass: 'bg-green-50', colorClass: 'text-green-600' },
  { key: 'im', label: '畅聊', icon: 'i-lucide-message-circle', to: '/dashboard/im', bgClass: 'bg-pink-50', colorClass: 'text-pink-600' },
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
  <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
  <div v-else>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-stone-800">首页</h1>
      <p class="text-sm text-stone-400 mt-0.5">看看今天有哪些事要处理</p>
    </div>

    <!-- 快捷入口 -->
    <div class="warm-card mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-stone-700">快捷入口</h3>
        <button @click="isEditingShortcuts = !isEditingShortcuts" class="text-xs text-amber-600 hover:text-amber-700 transition-colors">
          {{ isEditingShortcuts ? '完成' : '调整' }}
        </button>
      </div>
      <div v-if="isEditingShortcuts" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        <button v-for="item in allShortcuts" :key="item.key" @click="toggleShortcut(item.key)"
          :class="['flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
            pinnedKeys.includes(item.key) ? 'border-amber-400 bg-amber-50/50' : 'border-stone-100 opacity-50 hover:opacity-75 hover:border-stone-200']">
          <div :class="['w-8 h-8 rounded-lg flex items-center justify-center', item.bgClass]"><UIcon :name="item.icon" :class="['w-4 h-4', item.colorClass]" /></div>
          <span class="text-[11px] text-stone-600">{{ item.label }}</span>
          <UIcon v-if="pinnedKeys.includes(item.key)" name="i-lucide-check-circle-2" class="w-3.5 h-3.5 text-amber-500" />
          <div v-else class="w-3.5 h-3.5 rounded-full border border-stone-200" />
        </button>
        <!-- todos as special item -->
        <button @click="toggleShortcut('todos')"
          :class="['flex flex-col items-center gap-1 p-2 rounded-lg border transition-all',
            pinnedKeys.includes('todos') ? 'border-amber-400 bg-amber-50/50' : 'border-stone-100 opacity-50 hover:opacity-75 hover:border-stone-200']">
          <div class="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><UIcon name="i-lucide-list-checks" class="w-4 h-4 text-green-600" /></div>
          <span class="text-[11px] text-stone-600">待办</span>
          <UIcon v-if="pinnedKeys.includes('todos')" name="i-lucide-check-circle-2" class="w-3.5 h-3.5 text-amber-500" />
          <div v-else class="w-3.5 h-3.5 rounded-full border border-stone-200" />
        </button>
      </div>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        <NuxtLink v-for="item in pinnedShortcuts" :key="item.key" :to="item.to" class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-stone-50 transition-colors group">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform', item.bgClass]">
            <UIcon :name="item.icon" :class="['w-5 h-5', item.colorClass]" />
          </div>
          <span class="text-xs text-stone-600 group-hover:text-stone-800">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- KPI 卡片 -->
    <DashboardKpiCards :items="kpiItems" />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- 最近客户 -->
      <div class="warm-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-stone-700">最近添加的客户</h3>
          <NuxtLink to="/dashboard/customers" class="text-xs text-amber-600 hover:text-amber-700">查看全部 →</NuxtLink>
        </div>
        <div v-if="recentCustomers.length === 0" class="text-xs text-stone-400 py-4 text-center">还没有客户，加一个？</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="c in recentCustomers" :key="c.id" :to="`/dashboard/customers/${c.id}`" class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-stone-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <span class="text-amber-700 text-xs font-medium">{{ c.name?.charAt(0) }}</span>
              </div>
              <div class="min-w-0">
                <p class="text-sm text-stone-700 truncate">{{ c.name }}</p>
                <p class="text-xs text-stone-400">{{ c.industry || '未分类' }}</p>
              </div>
            </div>
            <span class="text-xs text-stone-400 flex-shrink-0">{{ (c.createdAt || '').slice(0, 10) }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- 最近商机 -->
      <div class="warm-card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-stone-700">最近商机</h3>
          <NuxtLink to="/dashboard/opportunities" class="text-xs text-amber-600 hover:text-amber-700">查看全部 →</NuxtLink>
        </div>
        <div v-if="recentOpportunities.length === 0" class="text-xs text-stone-400 py-4 text-center">还没有商机，创建一个？</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="o in recentOpportunities" :key="o.id" :to="`/dashboard/opportunities/${o.id}`" class="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-stone-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-lucide-flag" class="w-4 h-4 text-blue-400" />
              </div>
              <div class="min-w-0">
                <p class="text-sm text-stone-700 truncate">{{ o.name }}</p>
                <p class="text-xs text-stone-400">{{ oppStatusLabels[o.status] || o.status }}</p>
              </div>
            </div>
            <span class="text-sm text-stone-600 font-medium flex-shrink-0">{{ formatMoney(o.amount) }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- 提醒 + 销售漏斗 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 今日提醒 -->
      <DashboardReminderList :items="reminders" />

      <!-- 销售漏斗 -->
      <div class="warm-card">
        <h3 class="text-sm font-medium text-stone-700 mb-3">
          销售漏斗
          <span class="text-xs text-stone-400 ml-2">共 {{ funnelData.total }} 个商机</span>
        </h3>
        <div v-if="funnelData.stages.length === 0" class="text-xs text-stone-400 py-4 text-center">暂无数据</div>
        <div v-else class="space-y-2">
          <div v-for="stage in funnelData.stages" :key="stage.status" class="flex items-center gap-3">
            <span class="text-xs text-stone-500 w-16 flex-shrink-0">{{ oppStatusLabels[stage.status] || stage.status }}</span>
            <div class="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
              <div class="h-full bg-amber-400 rounded-full transition-all" :style="{ width: formatPercent(Number(stage.count), funnelData.total) }" />
            </div>
            <span class="text-xs text-stone-600 w-12 text-right">{{ stage.count }} 个</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
