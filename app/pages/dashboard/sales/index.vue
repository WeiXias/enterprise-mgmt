<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '销售订单', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: orderList, total, page, pageSize, keyword,
  totalPages, onSearchInput, onFilterChange, setFilter, fetchList: fetchOrders,
} = useTable<any>({ apiUrl: '/api/sales-orders' })

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/sales-orders/${deleteTarget.value.id}/delete`, { method: 'DELETE' }) as any
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
    <PageHeader title="销售订单" description="客户的订单都在这管，从确认到发货一条龙">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="$router.push('/dashboard/sales/create')">新建销售订单</UButton>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜销售订单编号..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <EnumSelect
        v-model="statusFilter"
        :options="[
          { value: '', label: '全部状态' },
          { value: 'draft', label: '草稿' },
          { value: 'confirmed', label: '已确认' },
          { value: 'shipped', label: '已发货' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ]"
        placeholder="全部状态"
      />
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="orderList.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-clipboard-list" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">还没有销售订单</p>
      <UButton class="mt-3" size="sm" color="primary" @click="$router.push('/dashboard/sales/create')">新建销售订单</UButton>
    </div>
    <div v-else class="space-y-2">
      <div v-for="order in orderList" :key="order.id" class="em-card flex items-center gap-4 hover:shadow-sm transition-shadow group">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0',
          order.status === 'draft' ? 'bg-gray-300' :
          order.status === 'confirmed' ? 'bg-brand-400' :
          order.status === 'shipped' ? 'bg-brand-400' :
          order.status === 'completed' ? 'bg-teal-400' : 'bg-red-300']" />
        <div class="flex-1 min-w-0 cursor-pointer" @click="$router.push(`/dashboard/sales/${order.id}`)">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary">{{ order.code }}</span>
            <StatusBadge :value="order.status" enum-type="salesOrderStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="order.customerName"><UIcon name="i-lucide-users" class="w-3 h-3 inline-block mr-0.5" />{{ order.customerName }}</span>
            <span><UIcon name="i-lucide-coins" class="w-3 h-3 inline-block mr-0.5" />{{ formatAmount(order.totalAmount) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1" @click.stop>
          <UButton v-if="order.status === 'draft'" icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="$router.push(`/dashboard/sales/${order.id}`)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = order; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchOrders" @next="fetchOrders" />

    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除销售订单「${deleteTarget?.code}」吗？`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
