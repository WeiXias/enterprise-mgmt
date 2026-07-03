<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '凭证列表', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const { getLabel } = useEnum()

const items = ref<any[]>([]); const loading = ref(true); const total = ref(0); const page = ref(1); const pageSize = ref(20)
const statusFilter = ref(''); const startDate = ref(''); const endDate = ref(''); const keyword = ref('')
const periods = ref<any[]>([])

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (keyword.value) params.keyword = keyword.value
    const res = await $api('/api/accounting/vouchers', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchPeriods() {
  try { const res = await $api('/api/accounting/periods') as any; if (res?.code === 0) periods.value = res.data || [] } catch {}
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

let searchTimer: any = null
function onSearch() { if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300) }

onMounted(() => { fetchItems(); fetchPeriods() })
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">凭证列表</h1>
        <p class="text-sm text-content-muted mt-0.5">管理所有会计凭证</p>
      </div>
      <NuxtLink to="/dashboard/finance/accounting/vouchers/new">
        <UButton icon="i-lucide-plus" color="primary">创建凭证</UButton>
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-3">
      <div class="relative flex-1 min-w-[160px] max-w-[240px]">
        <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜凭证号 / 摘要..." class="w-full pl-8 input-base focus-ring" @input="onSearch" />
      </div>
      <select v-model="statusFilter" class="input-base text-xs h-9" @change="page=1; fetchItems()">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="reviewed">已复核</option>
        <option value="approved">已审核</option>
        <option value="posted">已过账</option>
      </select>
      <DateRangePicker v-model:start-date="startDate" v-model:end-date="endDate" compact @update:start-date="page=1; fetchItems()" @update:end-date="page=1; fetchItems()" />
      <span class="text-xs text-content-muted ml-auto">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <p class="text-sm">还没有凭证</p>
      <NuxtLink to="/dashboard/finance/accounting/vouchers/new" class="mt-2 inline-block"><UButton size="sm" color="primary">新建凭证</UButton></NuxtLink>
    </div>
    <div v-else class="space-y-1">
      <NuxtLink v-for="item in items" :key="item.id" :to="`/dashboard/finance/accounting/vouchers/${item.id}`" class="em-card !p-2.5 flex items-center gap-3 group hover:shadow-sm transition-shadow cursor-pointer">
        <div :class="['w-1 h-8 rounded-full flex-shrink-0', item.status === 'posted' ? 'bg-teal-400' : item.status === 'approved' ? 'bg-blue-400' : item.status === 'reviewed' ? 'bg-brand-400' : 'bg-content-muted']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-content-primary">{{ item.voucherNo }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', item.status === 'posted' ? 'bg-teal-50 text-teal-600' : item.status === 'approved' ? 'bg-blue-50 text-blue-600' : item.status === 'reviewed' ? 'bg-brand-50 text-brand-600' : 'bg-surface-hover text-content-muted']">{{ getLabel ? getLabel('VoucherStatus', item.status) : item.status }}</span>
          </div>
          <div class="text-xs text-content-secondary mt-0.5">{{ item.summary || '暂无摘要' }}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-content-secondary">{{ item.voucherDate }}</div>
          <div class="text-xs text-content-muted mt-0.5">{{ item.createdBy?.name || '' }}</div>
        </div>
      </NuxtLink>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-muted">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上一页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下一页</UButton></div>
    </div>
  </div>
</template>
