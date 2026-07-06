<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '客户对账', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: items, total, page, keyword,
  totalPages, onSearchInput, onFilterChange, setFilter, fetchList,
} = useTable<any>({ apiUrl: '/api/reconciliations' })

const sortValue = ref('')
watch(sortValue, (v) => {
  if (!v) { setFilter('sortBy', ''); setFilter('sortOrder', '') }
  else { const idx = v.lastIndexOf('_'); setFilter('sortBy', v.slice(0, idx)); setFilter('sortOrder', v.slice(idx + 1)) }
  onFilterChange()
})

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

const showCreate = ref(false)
const showConfirm = ref(false)
const showDispute = ref(false)
const showDelete = ref(false)
const confirmTarget = ref<any>(null)
const disputeTarget = ref<any>(null)
const deleteTarget = ref<any>(null)
const actionLoading = ref(false)
const deleteLoading = ref(false)

const newForm = ref({ customerId: '', contractId: '', periodStart: '', periodEnd: '', remark: '' })

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

const statusLabels: Record<string, string> = { pending: '待确认', confirmed: '已确认', disputed: '有争议' }
const statusColors: Record<string, string> = {
  pending: 'bg-brand-50 text-brand-600',
  confirmed: 'bg-teal-50 text-teal-700',
  disputed: 'bg-warning-50 text-warning-700',
}

async function handleCreate() {
  if (!newForm.value.customerId || !newForm.value.periodStart || !newForm.value.periodEnd) {
    toast.add({ title: '客户和对账期间都要填哦', color: 'warning' }); return
  }
  actionLoading.value = true
  try {
    const res = await $api('/api/reconciliations', { method: 'POST', body: newForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '对账单已创建', color: 'success' })
      showCreate.value = false
      newForm.value = { customerId: '', contractId: '', periodStart: '', periodEnd: '', remark: '' }
      fetchList()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function handleConfirm() {
  actionLoading.value = true
  try {
    const res = await $api(`/api/reconciliations/${confirmTarget.value.id}/confirm`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: '对账已确认', color: 'success' }); showConfirm.value = false; fetchList() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '确认失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function handleDispute() {
  actionLoading.value = true
  try {
    const res = await $api(`/api/reconciliations/${disputeTarget.value.id}/dispute`, { method: 'POST', body: { remark: '' } }) as any
    if (res?.code === 0) { toast.add({ title: '已标记争议', color: 'success' }); showDispute.value = false; fetchList() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/reconciliations/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDelete.value = false; deleteTarget.value = null; fetchList() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

onMounted(() => { fetchList() })
</script>

<template>
  <div>
    <PageHeader title="客户对账" description="创建对账单，和对客户核对应收和回款">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" size="sm" @click="showCreate = true">新建对账单</UButton>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜客户名..." class="w-full pl-9 input-base focus-ring" @input="onSearchInput" />
      </div>
      <select v-model="statusFilter" class="input-base focus-ring">
        <option value="">全部状态</option>
        <option value="pending">待确认</option>
        <option value="confirmed">已确认</option>
        <option value="disputed">有争议</option>
      </select>
      <select v-model="sortValue" class="input-base focus-ring">
        <option value="">默认排序</option>
        <option value="closingAmount_desc">金额: 高→低</option>
        <option value="closingAmount_asc">金额: 低→高</option>
        <option value="periodStart_desc">期间: 近→远</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-file-check-2" class="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p class="text-sm">还没有对账单，建一个？</p>
    </div>
    <div v-else class="space-y-1">
      <div v-for="item in items" :key="item.id" class="em-card !p-2.5 flex items-center gap-3 group">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink :to="`/dashboard/finance/reconciliations/${item.id}`" class="text-sm font-medium text-content-primary hover:text-brand-600 truncate">{{ item.code }}</NuxtLink>
            <span :class="['text-xs px-1.5 py-0.5 rounded', statusColors[item.status] || 'bg-surface-hover text-content-secondary']">{{ statusLabels[item.status] || item.status }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-content-muted">
            <span>{{ item.customerName || '-' }}</span>
            <span>{{ item.periodStart?.slice(0, 10) }} ~ {{ item.periodEnd?.slice(0, 10) }}</span>
            <span>期末应收 {{ formatMoney(item.closingAmount) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <UButton v-if="item.status === 'pending'" icon="i-lucide-check-circle" variant="ghost" color="neutral" size="xs" title="确认对账" @click="confirmTarget = item; showConfirm = true" />
          <UButton v-if="item.status === 'pending'" icon="i-lucide-alert-triangle" variant="ghost" color="neutral" size="xs" title="标记争议" @click="disputeTarget = item; showDispute = true" />
          <UButton v-if="item.status === 'pending' || item.status === 'disputed'" icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" title="删除" @click="deleteTarget = item; showDelete = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchList" @next="fetchList" />

    <!-- 新建对账单 -->
    <FormModal v-if="showCreate" v-model:open="showCreate" title="新建对账单" size="standard" :loading="actionLoading" @confirm="handleCreate" @cancel="showCreate = false">
      <form class="space-y-3" @submit.prevent="handleCreate">
        <div><label class="block text-sm text-content-secondary mb-1">客户 <span class="text-danger-500">*</span></label><CustomerSelect v-model="newForm.customerId" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">合同（可选，不选则按客户维度对账）</label><input v-model="newForm.contractId" type="text" placeholder="合同 ID，留空则汇总所有合同" class="w-full input-base focus-ring" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">期间开始 <span class="text-danger-500">*</span></label><input v-model="newForm.periodStart" type="date" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">期间结束 <span class="text-danger-500">*</span></label><input v-model="newForm.periodEnd" type="date" class="w-full input-base focus-ring" /></div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="newForm.remark" type="text" class="w-full input-base focus-ring" /></div>
      </form>
    </FormModal>

    <ConfirmDialog v-if="showConfirm" v-model:open="showConfirm" title="确认对账"
      :message="`确认「${confirmTarget?.code}」对账无误吗？确认后关联回款将被锁定。`"
      confirm-text="确认" cancel-text="再想想" :loading="actionLoading" @confirm="handleConfirm" @cancel="showConfirm = false; confirmTarget = null" />
    <ConfirmDialog v-if="showDispute" v-model:open="showDispute" title="标记争议"
      :message="`确定将「${disputeTarget?.code}」标记为有争议吗？`"
      confirm-text="标记争议" cancel-text="再想想" :loading="actionLoading" @confirm="handleDispute" @cancel="showDispute = false; disputeTarget = null" />
    <ConfirmDialog v-if="showDelete" v-model:open="showDelete" title="确认删除"
      :message="`确定要删除对账单「${deleteTarget?.code}」吗？删了就找不回来了。`"
      confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" @cancel="showDelete = false; deleteTarget = null" />
  </div>
</template>
