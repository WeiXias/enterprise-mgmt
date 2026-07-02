<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '应付账款', middleware: ['auth'] })

const { $api } = useNuxtApp()

const { loading, list: items, total, page, pageSize, keyword, totalPages, onSearchInput, onFilterChange, setFilter, fetchList } = useTable<any>({ apiUrl: '/api/finance/ap' })

const overdueFilter = ref('')
watch(overdueFilter, (v) => { setFilter('overdue', v || undefined); onFilterChange() })

const sortBy = ref('')
const sortOrder = ref('desc')
watch([sortBy, sortOrder], ([by, order]) => { setFilter('sortBy', by || undefined); setFilter('sortOrder', by ? order : undefined); onFilterChange() })

const stats = ref({ total: 0, totalAmount: 0, overdueCount: 0, newThisMonth: 0 })
async function fetchStats() {
  try {
    const res = await $api('/api/finance/ap/stats') as any
    if (res?.code === 0) stats.value = res.data
  } catch { /* 静默 */ }
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

onMounted(() => { fetchList(); fetchStats() })
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div><h1 class="text-lg font-medium text-content-primary">应付账款</h1><p class="text-sm text-content-muted mt-0.5">已收货的采购订单，默认账期30天</p></div>
      <NuxtLink to="/dashboard/finance/ap/aging"><UButton icon="i-lucide-chart-no-axes-column" variant="ghost" color="neutral" size="sm">账龄分析</UButton></NuxtLink>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.total }}</div>
          <div class="text-xs text-content-muted">应付总数</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-coins" class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ formatMoney(stats.totalAmount) }}</div>
          <div class="text-xs text-content-muted">应付总额</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-danger-500" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.overdueCount }}</div>
          <div class="text-xs text-content-muted">已逾期</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-plus-circle" class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.newThisMonth }}</div>
          <div class="text-xs text-content-muted">本月新增</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <div class="relative flex-1 min-w-[160px] max-w-[240px]">
        <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜供应商名、订单号..." class="w-full pl-8 input-base focus-ring" @input="onSearchInput" />
      </div>
      <select v-model="overdueFilter" class="input-base text-xs">
        <option value="">全部</option><option value="yes">已逾期</option><option value="no">未逾期</option>
      </select>
      <select :value="`${sortBy}_${sortOrder}`" class="input-base text-xs" @change="(e: any) => { const [by, order] = (e.target as HTMLSelectElement).value.split('_'); sortBy = by || ''; sortOrder = order || 'desc' }">
        <option value="_">默认排序</option>
        <option value="amount_desc">金额: 高-低</option><option value="amount_asc">金额: 低-高</option>
        <option value="dueDate_asc">到期日: 近-远</option><option value="dueDate_desc">到期日: 远-近</option>
      </select>
      <span class="text-xs text-content-muted ml-auto">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-credit-card" class="w-10 h-10 mx-auto mb-2 text-content-muted" /><p class="text-sm">暂无应付</p>
    </div>
    <div v-else class="space-y-1">
      <div v-for="item in items" :key="item.id" class="em-card !p-2.5 flex items-center gap-3 group">
        <div :class="['w-1 h-9 rounded-full flex-shrink-0', item.overdueDays > 30 ? 'bg-danger-400' : item.overdueDays > 0 ? 'bg-brand-400' : 'bg-teal-400']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ item.supplierName || '未知供应商' }}</span>
            <span class="text-xs text-content-muted truncate">{{ item.code }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span>到期 {{ item.dueDate }}</span>
            <span v-if="item.overdueDays > 0" class="text-danger-500 font-medium">逾期 {{ item.overdueDays }} 天</span>
            <span v-else class="text-teal-500">未逾期</span>
          </div>
        </div>
        <span :class="['text-sm font-medium whitespace-nowrap text-right', item.overdueDays > 0 ? 'text-danger-500' : 'text-teal-600']">{{ formatMoney(item.amount) }}</span>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchList" @next="fetchList" />
  </div>
</template>
