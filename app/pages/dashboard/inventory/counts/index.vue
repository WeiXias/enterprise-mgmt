<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '盘点管理', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: counts, total, page, pageSize, keyword,
  totalPages, onSearchInput, onFilterChange, setFilter, fetchList,
} = useTable<any>({ apiUrl: '/api/inventory/counts' })

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({ code: '', warehouseId: '', plannedDate: '', remark: '' })

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

const warehouseOptions = ref<any[]>([])

async function fetchWarehouses() {
  try {
    const res = await $api('/api/warehouses') as any
    if (res?.code === 0) warehouseOptions.value = res.data?.items || res.data || []
  } catch { /* 静默 */ }
}

function resetCreateForm() {
  createForm.value = { code: '', warehouseId: '', plannedDate: '', remark: '' }
}

async function handleCreate() {
  createLoading.value = true
  try {
    const res = await $api('/api/inventory/counts', { method: 'POST', body: createForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '盘点计划已创建', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchList()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { createLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/inventory/counts/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchList()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

onMounted(() => { fetchList(); fetchWarehouses() })
</script>

<template>
  <div>
    <CommonPageHeader title="盘点管理" description="定期盘一盘，账实要相符">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="resetCreateForm(); showCreateModal = true">新建盘点</UButton>
      </template>
    </CommonPageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="keyword" type="text" placeholder="搜盘点单号..." class="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors" @input="onSearchInput" />
      </div>
      <select v-model="statusFilter" class="px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="counting">盘点中</option>
        <option value="completed">已完成</option>
      </select>
      <span class="text-xs text-gray-400">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="counts.length === 0" class="text-center py-12 text-gray-400">
      <UIcon name="i-lucide-clipboard-check" class="w-10 h-10 mx-auto mb-2 text-gray-300" />
      <p class="text-sm">还没有盘点计划</p>
    </div>
    <div v-else class="space-y-2">
      <div v-for="c in counts" :key="c.id" class="warm-card flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer" @click="$router.push(`/dashboard/inventory/counts/${c.id}`)">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0',
          c.status === 'draft' ? 'bg-gray-300' :
          c.status === 'counting' ? 'bg-amber-400' : 'bg-teal-400']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800">{{ c.code }}</span>
            <StatusBadge :value="c.status" enum-type="countStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span v-if="c.warehouseName"><UIcon name="i-lucide-warehouse" class="w-3 h-3 inline-block mr-0.5" />{{ c.warehouseName }}</span>
            <span v-if="c.plannedDate">计划 {{ c.plannedDate }}</span>
            <span v-if="c.completedAt">完成于 {{ c.completedAt?.slice(0, 10) }}</span>
          </div>
        </div>
        <UButton v-if="c.status === 'draft'" icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="deleteTarget = c; showDeleteModal = true" />
      </div>
    </div>

    <CommonPagination v-model:page="page" :total-pages="totalPages" @prev="fetchList" @next="fetchList" />

    <UModal v-model:open="showCreateModal">
      <template #header>新建盘点计划</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div>
            <label class="block text-sm text-gray-600 mb-1">盘点单号 <span class="text-gray-400 text-xs">(空则自动生成)</span></label>
            <input v-model="createForm.code" type="text" placeholder="自动生成" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">盘点仓库（可选）</label>
            <select v-model="createForm.warehouseId" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white">
              <option value="">全部仓库</option>
              <option v-for="w in warehouseOptions" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">计划日期</label>
            <input v-model="createForm.plannedDate" type="date" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">备注</label>
            <textarea v-model="createForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showCreateModal = false">取消</UButton>
          <UButton color="primary" :loading="createLoading" @click="handleCreate">创建</UButton>
        </div>
      </template>
    </UModal>

    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除盘点计划「${deleteTarget?.code}」吗？`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
