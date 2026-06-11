<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '首页', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const kpi = ref({ customerTotal: 0, opportunityInProgress: 0, contractAmountThisMonth: 0, receivedAmountThisMonth: 0 })
const reminders = ref([{ label: '待跟进客户', count: 0, bgClass: 'bg-amber-50', textClass: 'text-amber-700' }, { label: '即将到期合同', count: 0, bgClass: 'bg-blue-50', textClass: 'text-blue-600' }, { label: '待完成任务', count: 0, bgClass: 'bg-stone-100', textClass: 'text-stone-600' }])
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
  { label: '客户总数', value: kpi.value.customerTotal, icon: 'i-lucide-users', colorClass: 'text-amber-500', bgClass: 'bg-amber-50' },
  { label: '进行中商机', value: kpi.value.opportunityInProgress, icon: 'i-lucide-flag', colorClass: 'text-blue-400', bgClass: 'bg-blue-50' },
  { label: '本月合同额', value: formatMoney(kpi.value.contractAmountThisMonth), icon: 'i-lucide-file-text', colorClass: 'text-teal-600', bgClass: 'bg-teal-50' },
  { label: '本月回款', value: formatMoney(kpi.value.receivedAmountThisMonth), icon: 'i-lucide-dollar-sign', colorClass: 'text-teal-600', bgClass: 'bg-teal-50' },
])

onMounted(() => fetchData())
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
  <div v-else>
    <div class="mb-6">
      <h1 class="text-lg font-medium text-stone-800">首页</h1>
      <p class="text-sm text-stone-400 mt-0.5">看看今天有哪些事要处理</p>
    </div>

    <!-- KPI 卡片 -->
    <KpiCards :items="kpiItems" />

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
      <ReminderList :items="reminders" />

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
