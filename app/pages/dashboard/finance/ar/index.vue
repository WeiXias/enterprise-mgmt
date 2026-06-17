<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '应收账款', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: items, total, page, pageSize, keyword,
  totalPages, onSearchInput, onFilterChange, setFilter, fetchList,
} = useTable<any>({ apiUrl: '/api/finance/ar' })

const overdueFilter = ref('')
watch(overdueFilter, (v) => { setFilter('overdue', v); onFilterChange() })

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

onMounted(() => { fetchList() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">应收账款</h1>
        <p class="text-sm text-content-muted mt-0.5">合同付款计划 + 销售订单确认金额</p>
      </div>
      <NuxtLink to="/dashboard/finance/ar/aging">
        <UButton icon="i-lucide-chart-no-axes-column" variant="ghost" color="neutral" size="sm">账龄分析</UButton>
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜客户名、合同名..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <select v-model="overdueFilter" class="input-base focus-ring">
        <option value="">全部</option>
        <option value="yes">已逾期</option>
        <option value="no">未逾期</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-receipt" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">暂无应收</p>
    </div>
    <div v-else class="space-y-2">
      <div v-for="item in items" :key="item.id" class="em-card flex items-center gap-4">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', item.overdueDays > 30 ? 'bg-danger-400' : item.overdueDays > 0 ? 'bg-brand-400' : 'bg-teal-400']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ item.customerName || '未知客户' }}</span>
            <span class="text-xs text-content-muted">{{ item.contractName || '销售订单' }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span><UIcon name="i-lucide-coins" class="w-3 h-3 inline-block mr-0.5" />{{ formatAmount(item.amount) }}</span>
            <span>到期 {{ item.planDate?.slice(0, 10) }}</span>
            <span v-if="item.overdueDays > 0" class="text-danger-500 font-medium">逾期 {{ item.overdueDays }} 天</span>
            <span v-else class="text-teal-500">未逾期</span>
          </div>
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchList" @next="fetchList" />
  </div>
</template>
