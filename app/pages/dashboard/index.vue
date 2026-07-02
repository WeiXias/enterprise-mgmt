<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '首页', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const { getLabel } = useEnum()

const data = ref<any>({})
const loading = ref(true)

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await $api('/api/dashboard')
    if (res?.code === 0) data.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

onMounted(() => fetchData())

// 快捷入口
interface ShortcutItem { key: string; label: string; icon: string; to: string; bgClass: string; colorClass: string }
const allShortcuts: ShortcutItem[] = [
  { key: 'customers', label: '客户', icon: 'i-lucide-users', to: '/dashboard/customers', bgClass: 'bg-brand-50', colorClass: 'text-brand-600' },
  { key: 'opportunities', label: '商机', icon: 'i-lucide-flag', to: '/dashboard/opportunities', bgClass: 'bg-indigo-50', colorClass: 'text-indigo-600' },
  { key: 'contracts', label: '合同', icon: 'i-lucide-file-text', to: '/dashboard/contracts', bgClass: 'bg-violet-50', colorClass: 'text-violet-600' },
  { key: 'projects', label: '项目', icon: 'i-lucide-folder-open', to: '/dashboard/projects', bgClass: 'bg-sky-50', colorClass: 'text-sky-600' },
  { key: 'products', label: '产品', icon: 'i-lucide-tag', to: '/dashboard/products', bgClass: 'bg-teal-50', colorClass: 'text-teal-600' },
  { key: 'commissions', label: '提成', icon: 'i-lucide-wallet', to: '/dashboard/commissions', bgClass: 'bg-emerald-50', colorClass: 'text-emerald-600' },
  { key: 'finance', label: '财务', icon: 'i-lucide-dollar-sign', to: '/dashboard/finance', bgClass: 'bg-green-50', colorClass: 'text-green-600' },
]
const STORAGE_KEY = 'dashboard-shortcuts'
const defaultKeys = ['customers', 'opportunities', 'contracts', 'projects', 'todos']
const pinnedKeys = ref<string[]>([])
const isEditingShortcuts = ref(false)
function loadShortcuts() { try { const s = localStorage.getItem(STORAGE_KEY); pinnedKeys.value = s ? JSON.parse(s) : [...defaultKeys] } catch { pinnedKeys.value = [...defaultKeys] } }
function saveShortcuts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedKeys.value)) }
function toggleShortcut(key: string) { const idx = pinnedKeys.value.indexOf(key); if (idx >= 0) { if (pinnedKeys.value.length <= 1) { toast.add({ title: '至少保留一个快捷入口', color: 'warning' }); return } pinnedKeys.value.splice(idx, 1) } else pinnedKeys.value.push(key); saveShortcuts() }
const pinnedShortcuts = computed(() => pinnedKeys.value.map(key => { if (key === 'todos') return { key: 'todos', label: '待办', icon: 'i-lucide-list-checks', to: '/dashboard/todos', bgClass: 'bg-green-50', colorClass: 'text-green-600' }; return allShortcuts.find(s => s.key === key) }).filter(Boolean) as ShortcutItem[])
onMounted(() => loadShortcuts())

// 环形图计算
const amounts = computed(() => data.value.summaryAmounts || {})
const finance = computed(() => data.value.financeStats || {})
const inventory = computed(() => data.value.inventoryStats || {})
const customer = computed(() => data.value.customerStats || {})
const contract = computed(() => data.value.contractStats || {})
const funnel = computed(() => data.value.funnelData || { stages: [], total: 0 })
const reminders = computed(() => data.value.todayReminders || {})

const collectionRate = computed(() => {
  const t = amounts.value.contractTotal
  if (!t) return 0
  return Math.round(amounts.value.receivedTotal / t * 100)
})

const planRate = computed(() => {
  const pending = amounts.value.planPendingTotal
  const paid = amounts.value.planPaidTotal
  const total = pending + paid
  if (!total) return 0
  return Math.round(paid / total * 100)
})

const oppRate = computed(() => {
  const total = funnel.value.total
  if (!total) return 0
  const won = amounts.value.oppWonCount || 0
  return Math.round(won / total * 100)
})

const contractInProgress = computed(() => (contract.value.approved || 0) + (contract.value.inProgress || 0))

// 逾期收款提醒
const overdueReminders = computed(() => data.value.expiringContracts || [])
const expiringContracts = computed(() => data.value.expiringContracts || [])
</script>

<template>
  <div v-if="loading" class="text-center py-12">
    <div class="inline-flex items-center gap-2 text-content-muted"><UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" /><span class="text-sm">马上就好...</span></div>
  </div>

  <div v-else>
    <div class="mb-5">
      <h1 class="text-lg font-medium text-content-primary">首页</h1>
      <p class="text-xs text-content-muted mt-0.5">{{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) }}</p>
    </div>

    <!-- ===== 快捷入口 ===== -->
    <div class="em-card mb-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-content-secondary">快捷入口</h3>
        <button @click="isEditingShortcuts = !isEditingShortcuts" class="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors">{{ isEditingShortcuts ? '完成' : '调整' }}</button>
      </div>
      <div v-if="isEditingShortcuts" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        <button v-for="item in allShortcuts" :key="item.key" @click="toggleShortcut(item.key)" :class="['flex flex-col items-center gap-1 p-2 rounded-md border transition-all', pinnedKeys.includes(item.key) ? 'border-brand-400 bg-brand-50/50 shadow-sm' : 'border-line-light opacity-50 hover:opacity-75 hover:border-line']">
          <div :class="['w-8 h-8 rounded-md flex items-center justify-center', item.bgClass]"><UIcon :name="item.icon" :class="['w-4 h-4', item.colorClass]" /></div>
          <span class="text-[11px] text-content-secondary">{{ item.label }}</span>
          <UIcon v-if="pinnedKeys.includes(item.key)" name="i-lucide-check-circle-2" class="w-3.5 h-3.5 text-brand-500" />
          <div v-else class="w-3.5 h-3.5 rounded-full border border-line" />
        </button>
        <button @click="toggleShortcut('todos')" :class="['flex flex-col items-center gap-1 p-2 rounded-md border transition-all', pinnedKeys.includes('todos') ? 'border-brand-400 bg-brand-50/50 shadow-sm' : 'border-line-light opacity-50 hover:opacity-75 hover:border-line']">
          <div class="w-8 h-8 rounded-md bg-green-50 flex items-center justify-center"><UIcon name="i-lucide-list-checks" class="w-4 h-4 text-green-600" /></div>
          <span class="text-[11px] text-content-secondary">待办</span>
          <UIcon v-if="pinnedKeys.includes('todos')" name="i-lucide-check-circle-2" class="w-3.5 h-3.5 text-brand-500" />
          <div v-else class="w-3.5 h-3.5 rounded-full border border-line" />
        </button>
      </div>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        <NuxtLink v-for="item in pinnedShortcuts" :key="item.key" :to="item.to" class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-surface-hover transition-all group">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm', item.bgClass]"><UIcon :name="item.icon" :class="['w-5 h-5', item.colorClass]" /></div>
          <span class="text-xs text-content-secondary group-hover:text-content-primary">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- ===== 资金仪表 + 关键数字 ===== -->
    <div class="flex flex-col lg:flex-row gap-3 mb-4">
      <!-- 三环形图 -->
      <div class="flex-1 grid grid-cols-3 gap-3">
        <div class="em-card text-center py-4">
          <p class="text-[11px] text-content-muted mb-2">回款率</p>
          <div class="relative w-[72px] h-[72px] mx-auto mb-2 rounded-full" :style="{ background: `conic-gradient(#10b981 0% ${collectionRate}%, #e8e5df ${collectionRate}% 100%)` }">
            <div class="absolute inset-[8px] rounded-full bg-white flex flex-col items-center justify-center">
              <span class="text-[15px] font-medium text-emerald-600">{{ collectionRate }}%</span>
            </div>
          </div>
          <p class="text-[10px] text-content-muted">已回 {{ formatMoney(amounts.receivedTotal) }} / 合同 {{ formatMoney(amounts.contractTotal) }}</p>
        </div>
        <div class="em-card text-center py-4">
          <p class="text-[11px] text-content-muted mb-2">计划回款</p>
          <div class="relative w-[72px] h-[72px] mx-auto mb-2 rounded-full" :style="{ background: `conic-gradient(#EF9F27 0% ${planRate}%, #e8e5df ${planRate}% 100%)` }">
            <div class="absolute inset-[8px] rounded-full bg-white flex flex-col items-center justify-center">
              <span class="text-[15px] font-medium text-brand-600">{{ planRate }}%</span>
            </div>
          </div>
          <p class="text-[10px] text-content-muted">已收 {{ formatMoney(amounts.planPaidTotal) }} / 待收 {{ formatMoney(amounts.planPendingTotal) }}</p>
        </div>
        <div class="em-card text-center py-4">
          <p class="text-[11px] text-content-muted mb-2">商机转化</p>
          <div class="relative w-[72px] h-[72px] mx-auto mb-2 rounded-full" :style="{ background: `conic-gradient(#6366f1 0% ${oppRate}%, #e8e5df ${oppRate}% 100%)` }">
            <div class="absolute inset-[8px] rounded-full bg-white flex flex-col items-center justify-center">
              <span class="text-[15px] font-medium text-indigo-600">{{ oppRate }}%</span>
            </div>
          </div>
          <p class="text-[10px] text-content-muted">成交 {{ amounts.oppWonCount || 0 }} / 商机 {{ funnel.total }}</p>
        </div>
      </div>
      <!-- 关键数字 -->
      <div class="lg:w-[260px] em-card p-4 flex flex-col gap-3">
        <div><p class="text-[11px] text-content-muted">总收入</p><p class="text-lg font-medium text-emerald-600">{{ formatMoney(finance.totalIncome) }}</p></div>
        <div><p class="text-[11px] text-content-muted">总支出</p><p class="text-lg font-medium text-rose-600">{{ formatMoney(finance.totalExpense) }}</p></div>
        <div class="pt-3 border-t border-line-light"><p class="text-[11px] text-content-muted">净利润</p><p class="text-lg font-medium text-indigo-600">{{ formatMoney(finance.netBalance) }}</p></div>
      </div>
    </div>

    <!-- ===== 三列业务动态 ===== -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <!-- 销售 -->
      <div class="em-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">销售</h3>
          <NuxtLink to="/dashboard/opportunities" class="text-[11px] text-brand-600 hover:underline">全部</NuxtLink>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">客户</span>
            <span class="font-medium text-content-primary">{{ customer.total }} <span class="text-[11px] text-content-muted font-normal">本月 +{{ customer.newThisMonth }}</span></span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">商机</span>
            <span class="font-medium text-content-primary">{{ funnel.total }} <span class="text-[11px] text-content-muted font-normal">{{ formatMoney(amounts.oppTotal) }}</span></span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">合同</span>
            <span class="font-medium text-content-primary">{{ contract.total }} <span class="text-[11px] text-content-muted font-normal">执行 {{ contractInProgress }}</span></span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 text-xs">
            <span class="text-content-muted">销售漏斗</span>
            <span class="text-[11px] text-content-muted">
              <template v-for="(s, i) in funnel.stages.slice(0, 4)" :key="s.status">{{ (i as number) > 0 ? ' · ' : '' }}{{ getLabel('OpportunityStatus', s.status) || s.status }}{{ s.count }}</template>
            </span>
          </div>
        </div>
      </div>

      <!-- 财务 -->
      <div class="em-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">财务</h3>
          <NuxtLink to="/dashboard/finance" class="text-[11px] text-brand-600 hover:underline">全部</NuxtLink>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">开票总额</span>
            <span class="font-medium text-content-primary">{{ formatMoney(amounts.invoicedTotal) }}</span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">已开票未回款</span>
            <span class="font-medium text-amber-600">{{ formatMoney(amounts.invoicedUnpaidTotal) }}</span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">逾期</span>
            <span class="font-medium text-rose-600">{{ finance.overduePaymentCount }} 笔</span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 text-xs">
            <span class="text-content-muted">待报销</span>
            <span class="text-[11px] text-content-muted">{{ finance.pendingReimbursementCount }} 笔</span>
          </div>
        </div>
      </div>

      <!-- 进销存 -->
      <div class="em-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">进销存</h3>
          <NuxtLink to="/dashboard/products" class="text-[11px] text-brand-600 hover:underline">全部</NuxtLink>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">产品</span>
            <span class="font-medium text-content-primary">{{ inventory.productKinds }} 种</span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">库存量</span>
            <span class="font-medium text-content-primary">{{ (inventory.totalStock || 0).toLocaleString() }}</span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 border-b border-line-light text-xs">
            <span class="text-content-muted">低库存</span>
            <span :class="inventory.lowStockCount > 0 ? 'font-medium text-rose-600' : 'text-content-muted'">{{ inventory.lowStockCount }} 个预警</span>
          </div>
          <div class="flex justify-between items-baseline py-1.5 text-xs">
            <span class="text-content-muted">采购单</span>
            <span class="font-medium text-content-primary">{{ data.recentPurchaseOrders?.length || 0 }} <span class="text-[11px] text-content-muted font-normal">{{ formatMoney((data.recentPurchaseOrders || []).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0)) }}</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 提醒 + 最近动态 ===== -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- 需要关注 -->
      <div class="em-card p-4">
        <h3 class="text-sm font-medium text-content-primary mb-3">需要关注</h3>
        <div class="space-y-2">
          <div v-if="finance.overduePaymentCount > 0" class="flex items-start gap-2 p-2 rounded-md bg-rose-50/50 text-[12px] text-content-secondary">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <span>{{ finance.overduePaymentCount }} 笔收款计划已逾期，及时跟进处理</span>
          </div>
          <div v-if="expiringContracts.length > 0" class="flex items-start gap-2 p-2 rounded-md bg-amber-50/50 text-[12px] text-content-secondary">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <span>{{ expiringContracts.length }} 个合同 30 天内即将到期</span>
          </div>
          <div v-if="inventory.lowStockCount > 0" class="flex items-start gap-2 p-2 rounded-md bg-surface-hover text-[12px] text-content-secondary">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            <span>{{ inventory.lowStockCount }} 个产品库存低于安全线，建议补货</span>
          </div>
          <div v-if="reminders.dueTasks > 0" class="flex items-start gap-2 p-2 rounded-md bg-surface-hover text-[12px] text-content-secondary">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            <span>{{ reminders.dueTasks }} 个待办任务今日到期</span>
          </div>
          <div v-if="!finance.overduePaymentCount && !expiringContracts.length && !inventory.lowStockCount && !reminders.dueTasks" class="text-[12px] text-content-muted py-2 text-center">
            暂无需要关注的事项，一切顺利
          </div>
        </div>
      </div>

      <!-- 最近动态 -->
      <div class="em-card p-4 lg:col-span-2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近动态</h3>
          <NuxtLink to="/dashboard/finance/transactions" class="text-[11px] text-brand-600 hover:underline">全部流水</NuxtLink>
        </div>
        <div v-if="!data.recentTransactions?.length" class="text-xs text-content-muted py-6 text-center">暂无动态</div>
        <div v-else class="space-y-0.5">
          <div v-for="t in data.recentTransactions.slice(0, 6)" :key="t.id" class="flex items-center justify-between py-1.5 border-b border-line-light text-xs last:border-0">
            <div class="flex items-center gap-2 min-w-0">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full shrink-0', t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600']">{{ t.type === 'income' ? '收' : '支' }}</span>
              <span class="text-content-primary truncate">{{ t.description || t.category }}</span>
            </div>
            <span class="text-content-muted shrink-0 ml-2">{{ t.transactionDate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
