<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '首页', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const { getLabel } = useEnum()

const data = ref<any>({})
const loading = ref(true)

function formatMoney(v: any) { const n = Number(v); if (!n) return '¥0'; return '¥' + n.toLocaleString('zh-CN') }

const customerStatusLabels: Record<string, string> = { potential: '潜在', intentional: '意向', closed: '已成交', lost: '已流失' }
const customerStatusColors: Record<string, string> = { potential: 'bg-sky-50 text-sky-600', intentional: 'bg-brand-50 text-brand-600', closed: 'bg-teal-50 text-teal-600', lost: 'bg-slate-100 text-slate-500' }
const contractStatusLabels: Record<string, string> = { draft: '草稿', approved: '已审批', in_progress: '执行中', completed: '已完成', terminated: '已终止' }
const contractStatusColors: Record<string, string> = { draft: 'bg-slate-50 text-slate-500', approved: 'bg-brand-50 text-brand-600', in_progress: 'bg-brand-50 text-brand-700', completed: 'bg-teal-50 text-teal-700', terminated: 'bg-danger-50 text-danger-600' }
const purchaseStatusLabels: Record<string, string> = { draft: '草稿', submitted: '已提交', received: '已收货', cancelled: '已取消' }

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
  { key: 'im', label: '畅聊', icon: 'i-lucide-message-circle', to: '/dashboard/im', bgClass: 'bg-rose-50', colorClass: 'text-rose-500' },
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
</script>

<template>
  <div v-if="loading" class="text-center py-12">
    <div class="inline-flex items-center gap-2 text-content-muted"><UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin" /><span class="text-sm">马上就好...</span></div>
  </div>

  <div v-else>
    <div class="mb-6">
      <h1 class="text-xl font-medium text-content-primary">首页</h1>
      <p class="text-sm text-content-muted mt-1">看看今天有哪些事要处理</p>
    </div>

    <!-- 快捷入口 -->
    <div class="em-card mb-6">
      <div class="flex items-center justify-between mb-4">
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

    <!-- 总额概览 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-indigo-50 flex items-center justify-center"><UIcon name="i-lucide-flag" class="w-5 h-5 text-indigo-500" /></div>
        <div><p class="text-lg font-medium text-content-primary">{{ formatMoney(data.summaryAmounts?.oppTotal) }}</p><p class="text-xs text-content-secondary">商机总额</p></div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-violet-50 flex items-center justify-center"><UIcon name="i-lucide-file-text" class="w-5 h-5 text-violet-500" /></div>
        <div><p class="text-lg font-medium text-content-primary">{{ formatMoney(data.summaryAmounts?.contractTotal) }}</p><p class="text-xs text-content-secondary">合同总额</p></div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-sky-50 flex items-center justify-center"><UIcon name="i-lucide-file-check" class="w-5 h-5 text-sky-500" /></div>
        <div><p class="text-lg font-medium text-content-primary">{{ formatMoney(data.summaryAmounts?.invoicedTotal) }}</p><p class="text-xs text-content-secondary">开票总额</p></div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center"><UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-emerald-500" /></div>
        <div><p class="text-lg font-medium text-emerald-600">{{ formatMoney(data.summaryAmounts?.receivedTotal) }}</p><p class="text-xs text-content-secondary">已回款总额</p></div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-md bg-amber-50 flex items-center justify-center"><UIcon name="i-lucide-clock" class="w-5 h-5 text-amber-500" /></div>
        <div><p class="text-lg font-medium text-amber-600">{{ formatMoney(data.summaryAmounts?.unpaidTotal) }}</p><p class="text-xs text-content-secondary">待回款总额</p></div>
      </div>
    </div>

    <!-- ===== 客户经营 ===== -->
    <SectionHeader title="客户经营" />
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <KpiCard :to="`/dashboard/customers`" :value="data.customerStats?.total" label="客户总数" icon="i-lucide-users" color="bg-brand-50 text-brand-500" />
      <KpiCard :to="`/dashboard/customers`" :value="data.customerStats?.newThisMonth" label="本月新增" icon="i-lucide-user-plus" color="bg-sky-50 text-sky-500" />
      <KpiCard :to="`/dashboard/customers`" :value="data.customerStats?.closedCount" label="已成交客户" icon="i-lucide-badge-check" color="bg-teal-50 text-teal-500" />
      <KpiCard :to="`/dashboard/customers`" :value="data.customerStats?.potentialCount" label="潜在待跟进" icon="i-lucide-loader-circle" color="bg-brand-50 text-brand-500" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-3">客户状态分布</h3>
        <div class="space-y-2">
          <div v-for="s in data.customerStats?.byStatus" :key="s.status" class="flex items-center gap-3">
            <span :class="['text-xs px-2 py-0.5 rounded-full shrink-0', customerStatusColors[s.status] || '']">{{ customerStatusLabels[s.status] || s.status }}</span>
            <div class="flex-1 h-2 bg-line-light rounded-full overflow-hidden"><div class="h-full rounded-full" :class="s.status === 'closed' ? 'bg-teal-400' : s.status === 'lost' ? 'bg-slate-300' : 'bg-brand-400'" :style="{ width: data.customerStats?.total ? Math.round(s.count / data.customerStats.total * 100) + '%' : '0%' }" /></div>
            <span class="text-sm font-medium w-8 text-right">{{ s.count }}</span>
          </div>
        </div>
        <div v-if="data.customerStats?.byIndustry?.length" class="mt-3 pt-3 border-t border-line-light">
          <span class="text-xs text-content-secondary">热门行业：</span>
          <span v-for="ind in data.customerStats.byIndustry.slice(0, 5)" :key="ind.industry" class="text-xs px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 ml-1">{{ ind.industry }} · {{ ind.count }}</span>
        </div>
      </div>
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近新增客户</h3>
          <NuxtLink to="/dashboard/customers" class="text-xs text-brand-600 hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="!data.recentCustomers?.length" class="text-xs text-content-muted py-8 text-center">还没有客户，加一个？</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="c in data.recentCustomers" :key="c.id" :to="`/dashboard/customers/${c.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 transition-colors cursor-pointer">
            <div class="flex items-center gap-2 min-w-0">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full shrink-0', customerStatusColors[c.status] || '']">{{ customerStatusLabels[c.status] || c.status }}</span>
              <span class="text-sm truncate">{{ c.name }}</span>
            </div>
            <span class="text-xs text-content-muted shrink-0 ml-2">{{ c.createdAt?.slice(0, 10) }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ===== 商机 ===== -->
    <SectionHeader title="商机" />
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <KpiCard :to="`/dashboard/opportunities`" :value="data.kpi?.oppTotalAmount" :format="formatMoney" label="商机总金额" icon="i-lucide-trending-up" color="bg-brand-50 text-brand-600" />
      <KpiCard :to="`/dashboard/opportunities`" :value="data.kpi?.opportunityInProgress" label="进行中" icon="i-lucide-flag" color="bg-indigo-50 text-indigo-500" />
      <KpiCard :to="`/dashboard/opportunities`" :value="data.kpi?.newOppsThisMonth" label="本月新增" icon="i-lucide-plus-circle" color="bg-violet-50 text-violet-500" />
      <KpiCard :to="`/dashboard/opportunities/funnel`" :value="data.funnelData?.total" label="商机总数" icon="i-lucide-funnel" color="bg-brand-50 text-brand-500" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-3">销售漏斗</h3>
        <div v-if="!data.funnelData?.stages?.length" class="text-xs text-content-muted py-4 text-center">暂无数据</div>
        <div v-else class="space-y-2">
          <div v-for="s in data.funnelData.stages" :key="s.status" class="flex items-center gap-3">
            <span class="text-xs text-content-secondary w-16 shrink-0">{{ getLabel('OpportunityStatus', s.status) || s.status }}</span>
            <div class="flex-1 h-2 bg-line-light rounded-full overflow-hidden"><div class="h-full bg-brand-400 rounded-full" :style="{ width: data.funnelData.total ? Math.round(s.count / data.funnelData.total * 100) + '%' : '0%' }" /></div>
            <span class="text-xs text-content-muted w-12 text-right">{{ s.count }} 个</span>
          </div>
        </div>
      </div>
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近商机</h3>
          <NuxtLink to="/dashboard/opportunities" class="text-xs text-brand-600 hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="!data.recentOpportunities?.length" class="text-xs text-content-muted py-8 text-center">还没有商机</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="o in data.recentOpportunities" :key="o.id" :to="`/dashboard/opportunities/${o.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 transition-colors cursor-pointer">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 shrink-0">{{ getLabel('OpportunityStatus', o.status) || o.status }}</span>
              <span class="text-sm truncate">{{ o.name }}</span>
            </div>
            <span class="text-sm font-medium shrink-0 ml-2">{{ formatMoney(o.amount) }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ===== 合同 ===== -->
    <SectionHeader title="合同" />
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <KpiCard :to="`/dashboard/contracts`" :value="data.contractStats?.total" label="合同总数" icon="i-lucide-file-text" color="bg-brand-50 text-brand-600" />
      <KpiCard :to="`/dashboard/contracts`" :value="(data.contractStats?.approved||0) + (data.contractStats?.inProgress||0)" label="进行中" icon="i-lucide-check-circle" color="bg-teal-50 text-teal-600" />
      <KpiCard :to="`/dashboard/contracts`" :value="data.contractStats?.receivedAmount" :format="formatMoney" label="已回款" icon="i-lucide-dollar-sign" color="bg-emerald-50 text-emerald-600" />
      <KpiCard :to="`/dashboard/contracts`" :value="data.contractStats?.unreceivedAmount" :format="formatMoney" label="待回款" icon="i-lucide-clock" color="bg-danger-50 text-danger-500" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <div class="em-card">
        <h3 class="text-sm font-medium text-content-primary mb-3">合同状态分布</h3>
        <div class="space-y-2">
          <div v-for="st in ['draft','approved','in_progress','completed','terminated']" :key="st" class="flex items-center justify-between text-xs">
            <span class="text-content-secondary">{{ contractStatusLabels[st] }}</span>
            <span class="text-content-primary">{{ data.contractStats?.[st] || 0 }}</span>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-line-light">
          <div class="flex items-center justify-between text-xs"><span class="text-content-secondary">回款率</span><span :class="(data.contractStats?.receivedAmount + data.contractStats?.unreceivedAmount) > 0 ? 'text-teal-600' : 'text-content-muted'" class="font-medium">{{ (data.contractStats?.receivedAmount + data.contractStats?.unreceivedAmount) > 0 ? Math.round(data.contractStats.receivedAmount / (data.contractStats.receivedAmount + data.contractStats.unreceivedAmount) * 100) : 0 }}%</span></div>
        </div>
      </div>
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近合同</h3>
          <NuxtLink to="/dashboard/contracts" class="text-xs text-brand-600 hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="!data.recentContracts?.length" class="text-xs text-content-muted py-8 text-center">暂无合同</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="c in data.recentContracts" :key="c.id" :to="`/dashboard/contracts/${c.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 transition-colors cursor-pointer">
            <div class="flex items-center gap-2 min-w-0">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full shrink-0', contractStatusColors[c.status] || '']">{{ contractStatusLabels[c.status] || c.status }}</span>
              <span class="text-sm truncate">{{ c.name }}</span>
            </div>
            <span class="text-sm font-medium shrink-0 ml-2">{{ formatMoney(c.totalAmount) }}</span>
          </NuxtLink>
        </div>
        <!-- 30天到期 -->
        <div v-if="data.expiringContracts?.length" class="mt-3 pt-3 border-t border-line-light">
          <h4 class="text-xs text-content-secondary mb-2">30 天内到期</h4>
          <div v-for="c in data.expiringContracts" :key="c.id" class="flex items-center justify-between p-1.5 text-xs rounded hover:bg-line-light/40 cursor-pointer" @click="$router.push(`/dashboard/contracts/${c.id}`)">
            <span class="truncate">{{ c.name }}</span>
            <span class="text-amber-600 ml-2 shrink-0">{{ c.endDate?.slice(0, 10) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 财务 ===== -->
    <SectionHeader title="财务" />
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <KpiCard :to="`/dashboard/finance`" :value="data.financeStats?.totalIncome" :format="formatMoney" label="总收入" icon="i-lucide-trending-up" color="bg-teal-50 text-teal-500" />
      <KpiCard :to="`/dashboard/finance`" :value="data.financeStats?.totalExpense" :format="formatMoney" label="总支出" icon="i-lucide-trending-down" color="bg-danger-50 text-danger-500" />
      <KpiCard :to="`/dashboard/finance`" :value="data.financeStats?.netBalance" :format="formatMoney" label="净利润" icon="i-lucide-dollar-sign" color="bg-brand-50 text-brand-500" />
      <KpiCard :to="`/dashboard/finance`" :value="data.financeStats?.overduePaymentCount + data.financeStats?.pendingReimbursementCount" label="待跟进" icon="i-lucide-bell" color="bg-brand-50 text-brand-400" />
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-1 gap-4 mb-8">
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近流水</h3>
          <NuxtLink to="/dashboard/finance/transactions" class="text-xs text-brand-600 hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="!data.recentTransactions?.length" class="text-xs text-content-muted py-4 text-center">暂无流水</div>
        <div v-else class="space-y-1">
          <div v-for="t in data.recentTransactions.slice(0, 8)" :key="t.id" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 text-xs">
            <div class="flex items-center gap-2">
              <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', t.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-danger-50 text-danger-600']">{{ t.type === 'income' ? '收' : '支' }}</span>
              <span class="text-content-primary">{{ t.description || t.category }}</span>
              <span class="text-content-muted">{{ t.transactionDate }}</span>
            </div>
            <span :class="t.type === 'income' ? 'text-teal-600' : 'text-danger-500'" class="font-medium">{{ t.type === 'income' ? '+' : '-' }}{{ formatMoney(t.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 进销存 ===== -->
    <SectionHeader title="进销存" />
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
      <KpiCard :to="`/dashboard/products`" :value="data.inventoryStats?.productKinds" label="产品种类" icon="i-lucide-tag" color="bg-teal-50 text-teal-600" />
      <KpiCard :to="`/dashboard/inventory`" :value="data.inventoryStats?.totalStock" label="总库存量" icon="i-lucide-package" color="bg-brand-50 text-brand-500" />
      <KpiCard :to="`/dashboard/products`" :value="data.inventoryStats?.lowStockCount" label="低库存预警" icon="i-lucide-alert-triangle" color="bg-amber-50 text-amber-500" />
    </div>
    <div class="mb-8">
      <div class="em-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-content-primary">最近采购订单</h3>
          <NuxtLink to="/dashboard/purchases" class="text-xs text-brand-600 hover:underline">查看全部</NuxtLink>
        </div>
        <div v-if="!data.recentPurchaseOrders?.length" class="text-xs text-content-muted py-6 text-center">暂无采购订单</div>
        <div v-else class="space-y-1">
          <NuxtLink v-for="o in data.recentPurchaseOrders" :key="o.id" :to="`/dashboard/purchases/${o.id}`" class="flex items-center justify-between p-2 rounded-md hover:bg-line-light/40 transition-colors cursor-pointer">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 shrink-0">{{ purchaseStatusLabels[o.status] || o.status }}</span>
              <span class="text-sm truncate">{{ o.code }}</span>
              <span class="text-xs text-content-muted">{{ o.supplierName }}</span>
            </div>
            <span class="text-sm font-medium shrink-0 ml-2">{{ formatMoney(o.totalAmount) }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
