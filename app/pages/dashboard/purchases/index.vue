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

const { getLabel } = useEnum()

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/purchase-orders/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
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

onMounted(() => { fetchOrders() })
</script>

<template>
  <div>
    <CommonPageHeader title="采购订单" description="向供应商采购产品，管好进货">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="$router.push('/dashboard/purchases/create')">新建采购订单</UButton>
      </template>
    </CommonPageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="keyword" type="text" placeholder="搜采购订单编号..." class="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors" @input="onSearchInput" />
      </div>
      <select v-model="statusFilter" class="px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="submitted">已提交</option>
        <option value="received">已收货</option>
        <option value="cancelled">已取消</option>
      </select>
      <span class="text-xs text-gray-400">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="orderList.length === 0" class="text-center py-12 text-gray-400">
      <UIcon name="i-lucide-clipboard-list" class="w-10 h-10 mx-auto mb-2 text-gray-300" />
      <p class="text-sm">还没有采购订单</p>
      <UButton class="mt-3" size="sm" color="primary" @click="$router.push('/dashboard/purchases/create')">新建采购订单</UButton>
    </div>
    <div v-else class="space-y-2">
      <div v-for="order in orderList" :key="order.id" class="warm-card flex items-center gap-4 hover:shadow-sm transition-shadow group">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0',
          order.status === 'draft' ? 'bg-gray-300' :
          order.status === 'submitted' ? 'bg-amber-400' :
          order.status === 'received' ? 'bg-teal-400' : 'bg-red-300']" />
        <div class="flex-1 min-w-0 cursor-pointer" @click="$router.push(`/dashboard/purchases/${order.id}`)">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800">{{ order.code }}</span>
            <StatusBadge :value="order.status" enum-type="purchaseOrderStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span v-if="order.supplierName"><UIcon name="i-lucide-building-2" class="w-3 h-3 inline-block mr-0.5" />{{ order.supplierName }}</span>
            <span><UIcon name="i-lucide-coins" class="w-3 h-3 inline-block mr-0.5" />{{ formatAmount(order.totalAmount) }}</span>
            <span v-if="order.expectedDate">预计 {{ order.expectedDate }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1" @click.stop>
          <UButton v-if="order.status === 'draft'" icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="$router.push(`/dashboard/purchases/${order.id}`)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = order; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <CommonPagination v-model:page="page" :total-pages="totalPages" @prev="fetchOrders" @next="fetchOrders" />

    <CommonConfirmDialog
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
