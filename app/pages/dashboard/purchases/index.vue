<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '采购订单', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: orderList, total, page, pageSize, keyword,
  totalPages, onSearchInput, onFilterChange, setFilter, fetchList: fetchOrders,
} = useTable<any>({ apiUrl: '/api/purchase-orders' })

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/purchase-orders/${deleteTarget.value.id}/delete`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchOrders()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

// 统计
const stats = ref({ total: 0, totalAmount: 0, pendingCount: 0, newThisMonth: 0 })

async function fetchStats() {
  try {
    const res = await $api('/api/purchase-orders/stats') as any
    if (res?.code === 0) stats.value = res.data
  } catch { /* ignore */ }
}

const statCards = [
  { key: 'total', label: '采购单总数', icon: 'i-lucide-clipboard-list', color: 'border-brand-400', bg: 'bg-brand-50', val: () => stats.value.total },
  { key: 'amount', label: '采购总金额', icon: 'i-lucide-coins', color: 'border-teal-400', bg: 'bg-teal-50', val: () => formatAmount(stats.value.totalAmount) },
  { key: 'pending', label: '待完成', icon: 'i-lucide-clock', color: 'border-brand-400', bg: 'bg-brand-50', val: () => stats.value.pendingCount },
  { key: 'newMonth', label: '本月新增', icon: 'i-lucide-plus-circle', color: 'border-teal-400', bg: 'bg-teal-50', val: () => stats.value.newThisMonth },
]

// 排序
const sortType = ref('created-desc')
const sortOptions = [
  { value: 'created-desc', label: '最近创建' },
  { value: 'created-asc', label: '最早创建' },
  { value: 'amount-desc', label: '金额从高到低' },
  { value: 'amount-asc', label: '金额从低到高' },
]

const sortedList = computed(() => {
  const arr = [...orderList.value]
  if (sortType.value === 'created-desc') arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  else if (sortType.value === 'created-asc') arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  else if (sortType.value === 'amount-desc') arr.sort((a, b) => (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0))
  else if (sortType.value === 'amount-asc') arr.sort((a, b) => (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0))
  return arr
})

onMounted(() => { fetchOrders(); fetchStats() })
</script>

<template>
  <div>
    <PageHeader title="采购订单" description="向供应商采购产品，管好进货">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="$router.push('/dashboard/purchases/create')">新建采购订单</UButton>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div v-for="card in statCards" :key="card.key" :class="['em-card !p-3 border-l-2', card.color]">
        <div class="flex items-center gap-2 mb-1">
          <div :class="['w-7 h-7 rounded-md flex items-center justify-center', card.bg]">
            <UIcon :name="card.icon" class="w-4 h-4 text-content-secondary" />
          </div>
          <span class="text-xs text-content-muted">{{ card.label }}</span>
        </div>
        <p class="text-lg font-medium text-content-primary ml-9">{{ card.val() }}</p>
      </div>
    </div>

    <!-- 搜索筛选排序栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜采购单..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <EnumSelect
        v-model="statusFilter"
        :options="[
          { value: '', label: '全部状态' },
          { value: 'draft', label: '草稿' },
          { value: 'submitted', label: '已提交' },
          { value: 'received', label: '已收货' },
          { value: 'cancelled', label: '已取消' },
        ]"
        placeholder="全部状态"
      />
      <select v-model="sortType" class="input-base focus-ring text-sm min-w-[120px]">
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="orderList.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-clipboard-list" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">还没有采购订单</p>
      <UButton class="mt-3" size="sm" color="primary" @click="$router.push('/dashboard/purchases/create')">新建采购订单</UButton>
    </div>
    <div v-else class="space-y-1">
      <div v-for="order in sortedList" :key="order.id" class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer group" @click="$router.push(`/dashboard/purchases/${order.id}`)">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0',
          order.status === 'draft' ? 'bg-neutral-300' :
          order.status === 'submitted' ? 'bg-brand-400' :
          order.status === 'received' ? 'bg-teal-400' : 'bg-danger-300']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ order.code }}</span>
            <StatusBadge :value="order.status" enum-type="purchaseOrderStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="order.supplierName"><UIcon name="i-lucide-building-2" class="w-3 h-3 inline-block mr-0.5" />{{ order.supplierName }}</span>
            <span v-if="order.contractName" class="text-brand-600"><UIcon name="i-lucide-file-text" class="w-3 h-3 inline-block mr-0.5" />{{ order.contractName }}</span>
            <span v-if="order.expectedDate">预计 {{ order.expectedDate }}</span>
          </div>
        </div>
        <span class="text-sm font-medium text-brand-600 whitespace-nowrap">{{ formatAmount(order.totalAmount) }}</span>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <UButton v-if="order.status === 'draft'" icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="$router.push(`/dashboard/purchases/${order.id}`)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = order; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchOrders" @next="fetchOrders" />

    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除采购订单「${deleteTarget?.code}」吗？`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
