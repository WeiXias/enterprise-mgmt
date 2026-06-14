<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '合同台账', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const statusFilter = ref('')

const { getLabel } = useEnum()

const statusColors: Record<string, string> = {
  draft: 'bg-surface-hover text-content-secondary',
  approved: 'bg-brand-50 text-brand-600',
  in_progress: 'bg-brand-50 text-brand-700',
  completed: 'bg-teal-50 text-teal-700',
  terminated: 'bg-red-50 text-red-600',
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function formatDate(v: any) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function getStatusLabel(s: string) { return getLabel('ContractStatus', s) || s }
function getStatusColor(s: string) { return statusColors[s] || 'bg-surface-hover text-content-secondary' }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    const res = await $api('/api/contracts/ledger', { params }) as any
    if (res?.code === 0) {
      items.value = res.data.items || []
      total.value = res.data.total
    }
  } catch {
    toast.add({ title: '加载出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; fetchItems() }, 300)
}

function onFilterChange() { page.value = 1; fetchItems() }

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => fetchItems())
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">合同台账</h1>
        <p class="text-sm text-content-muted mt-0.5">看看哪些合同还没回完款</p>
      </div>
      <NuxtLink to="/dashboard/contracts">
        <UButton icon="i-lucide-file-text" variant="ghost" color="neutral" size="sm">合同列表</UButton>
      </NuxtLink>
    </div>

    <!-- 搜索筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜索合同号或客户名..."
          class="w-full pl-9 input-base focus-ring transition-colors"
          @input="onSearchInput" />
      </div>
      <EnumSelect v-model="statusFilter" dict="ContractStatus" placeholder="全部状态" @change="onFilterChange" />
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <!-- 台账列表 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="em-card text-center py-10">
      <UIcon name="i-lucide-file-text" class="w-8 h-8 text-content-muted mx-auto mb-3" />
      <p class="text-sm text-content-muted">还没有合同记录</p>
    </div>
    <div v-else class="space-y-1.5">
      <!-- 表头 -->
      <div class="flex items-center gap-3 px-4 py-2 text-xs text-content-muted font-medium">
        <div class="w-1 flex-shrink-0" />
        <div class="flex-[2] min-w-0">合同号 / 名称</div>
        <div class="flex-1 min-w-0">客户</div>
        <div class="flex-1 min-w-0 text-right">总额</div>
        <div class="flex-1 min-w-0 text-right">已收</div>
        <div class="flex-1 min-w-0 text-right">未收</div>
        <div class="w-20 text-center">回款进度</div>
        <div class="flex-1 min-w-0">下次收款</div>
        <div class="w-20 text-center">状态</div>
      </div>

      <div v-for="item in items" :key="item.contractNo" class="em-card flex items-center gap-3 !py-3 !px-4 hover:bg-surface-hover transition-colors">
        <!-- 逾期标记 -->
        <div :class="[
          'w-1 h-9 rounded-full flex-shrink-0',
          item.paymentProgress < 100 ? (item.unreceivedAmount > 0 ? 'bg-red-400' : 'bg-brand-400') : 'bg-teal-400'
        ]" />

        <div class="flex-[2] min-w-0">
          <p class="text-xs text-content-muted truncate">{{ item.contractNo }}</p>
          <p class="text-sm text-content-primary truncate">{{ item.name }}</p>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-content-secondary truncate">{{ item.customer }}</p>
        </div>
        <div class="flex-1 min-w-0 text-right">
          <p class="text-sm text-content-secondary">{{ formatMoney(item.totalAmount) }}</p>
        </div>
        <div class="flex-1 min-w-0 text-right">
          <p class="text-sm text-teal-600">{{ formatMoney(item.receivedAmount) }}</p>
        </div>
        <div class="flex-1 min-w-0 text-right">
          <p :class="['text-sm', item.unreceivedAmount > 0 ? 'text-red-500 font-medium' : 'text-content-muted']">
            {{ formatMoney(item.unreceivedAmount) }}
          </p>
        </div>
        <div class="w-20 text-center">
          <div class="flex items-center gap-1">
            <div class="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full', item.paymentProgress >= 100 ? 'bg-teal-400' : 'bg-brand-400']"
                :style="{ width: item.paymentProgress + '%' }"
              />
            </div>
            <span class="text-xs text-content-muted w-8">{{ Math.round(item.paymentProgress) }}%</span>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-content-muted">{{ item.nextPaymentDate ? formatDate(item.nextPaymentDate) : '-' }}</p>
        </div>
        <div class="w-20 text-center">
          <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(item.status)]">
            {{ getStatusLabel(item.status) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-muted">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下一页</UButton>
      </div>
    </div>
  </div>
</template>
