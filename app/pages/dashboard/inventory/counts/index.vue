<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '盘点管理', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const { loading, list: counts, total, page, pageSize, keyword, totalPages, onSearchInput, onFilterChange, setFilter, fetchList } = useTable<any>({ apiUrl: '/api/inventory/counts' })

const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v || undefined); onFilterChange() })

const sortBy = ref('')
const sortOrder = ref('desc')
watch([sortBy, sortOrder], ([by, order]) => { setFilter('sortBy', by || undefined); setFilter('sortOrder', by ? order : undefined); onFilterChange() })

const stats = ref({ total: 0, pendingCount: 0, completedCount: 0 })
async function fetchStats() {
  try {
    const res = await $api('/api/inventory/counts/stats') as any
    if (res?.code === 0) stats.value = res.data
  } catch { /* 静默 */ }
}

const showCreateModal = ref(false); const createLoading = ref(false)
const createForm = ref({ code: '', warehouseId: '', plannedDate: '', remark: '' })
const showDeleteModal = ref(false); const deleteTarget = ref<any>(null); const deleteLoading = ref(false)
const warehouseOptions = ref<any[]>([])

async function fetchWarehouses() { try { const res = await $api('/api/warehouses') as any; if (res?.code === 0) warehouseOptions.value = res.data?.items || res.data || [] } catch {} }
function resetCreateForm() { createForm.value = { code: '', warehouseId: '', plannedDate: '', remark: '' } }

async function handleCreate() {
  createLoading.value = true
  try { const res = await $api('/api/inventory/counts', { method: 'POST', body: createForm.value }) as any; if (res?.code === 0) { toast.add({ title: '盘点计划已创建', color: 'success' }); showCreateModal.value = false; resetCreateForm(); fetchList(); fetchStats() } }
  catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) } finally { createLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return; deleteLoading.value = true
  try { const res = await $api(`/api/inventory/counts/${deleteTarget.value.id}`, { method: 'DELETE' }) as any; if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchList(); fetchStats() } }
  catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) } finally { deleteLoading.value = false }
}

onMounted(() => { fetchList(); fetchWarehouses(); fetchStats() })
</script>

<template>
  <div>
    <PageHeader title="盘点管理" description="定期盘一盘，账实要相符">
      <template #actions><UButton icon="i-lucide-plus" color="primary" @click="resetCreateForm(); showCreateModal = true">新建盘点</UButton></template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-clipboard-check" class="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.total }}</div>
          <div class="text-xs text-content-muted">盘点总数</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-play-circle" class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.pendingCount }}</div>
          <div class="text-xs text-content-muted">进行中</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.completedCount }}</div>
          <div class="text-xs text-content-muted">已完成</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <div class="relative flex-1 min-w-[160px] max-w-[240px]">
        <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜盘点单号..." class="w-full pl-8 input-base focus-ring" @input="onSearchInput" />
      </div>
      <select v-model="statusFilter" class="input-base text-xs">
        <option value="">全部状态</option><option value="draft">草稿</option><option value="counting">盘点中</option><option value="completed">已完成</option>
      </select>
      <select :value="`${sortBy}_${sortOrder}`" class="input-base text-xs" @change="(e: any) => { const [by, order] = (e.target as HTMLSelectElement).value.split('_'); sortBy = by || ''; sortOrder = order || 'desc' }">
        <option value="_">创建时间</option>
        <option value="createdAt_desc">最新优先</option><option value="createdAt_asc">最早优先</option>
      </select>
      <span class="text-xs text-content-muted ml-auto">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="counts.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-clipboard-check" class="w-10 h-10 mx-auto mb-2 text-content-muted" /><p class="text-sm">还没有盘点计划</p>
    </div>
    <div v-else class="space-y-1">
      <div v-for="c in counts" :key="c.id" class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow group cursor-pointer" @click="$router.push(`/dashboard/inventory/counts/${c.id}`)">
        <div :class="['w-1 h-9 rounded-full flex-shrink-0', c.status === 'draft' ? 'bg-neutral-300' : c.status === 'counting' ? 'bg-brand-400' : 'bg-teal-400']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ c.code }}</span>
            <StatusBadge :value="c.status" enum-type="countStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="c.warehouseName" class="flex items-center gap-1"><UIcon name="i-lucide-warehouse" class="w-3 h-3" />{{ c.warehouseName }}</span>
            <span v-if="c.plannedDate">{{ c.plannedDate }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" @click.stop>
          <UButton v-if="c.status === 'draft'" icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = c; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchList" @next="fetchList" />

    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="新建盘点计划" size="compact" :loading="createLoading" @confirm="handleCreate" @cancel="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div><label class="block text-sm text-content-secondary mb-1">盘点单号</label><input v-model="createForm.code" type="text" placeholder="留空时帮你填好" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">盘点仓库</label><select v-model="createForm.warehouseId" class="w-full input-base focus-ring"><option value="">全部仓库</option><option v-for="w in warehouseOptions" :key="w.id" :value="w.id">{{ w.name }}</option></select></div>
        <div><label class="block text-sm text-content-secondary mb-1">计划日期</label><input v-model="createForm.plannedDate" type="date" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><textarea v-model="createForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" /></div>
      </form>
    </FormModal>

    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" :message="`确定要删除盘点计划「${deleteTarget?.code}」吗？`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" @cancel="deleteTarget = null" />
  </div>
</template>
