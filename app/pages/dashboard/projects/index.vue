<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '项目', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

// 列表状态由 useTable 管理
const { loading, list: projectsList, total, page, pageSize, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchProjects } = useTable<any>({ apiUrl: '/api/projects' })

// 状态筛选（独立 ref，通过 watch 同步到 useTable）
const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

// 排序
const sortBy = ref('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
watch([sortBy, sortOrder], () => { setFilter('sortBy', sortBy.value); setFilter('sortOrder', sortOrder.value); onFilterChange() })

const sortOptions = [
  { label: '预算从高到低', value: 'budget:desc' },
  { label: '预算从低到高', value: 'budget:asc' },
  { label: '结束日期近→远', value: 'endDate:asc' },
  { label: '结束日期远→近', value: 'endDate:desc' },
]
const currentSortKey = computed(() => `${sortBy.value}:${sortOrder.value}`)
function onSortChange(val: string) {
  const [by = 'updatedAt', order = 'desc'] = val.split(':')
  sortBy.value = by
  sortOrder.value = order as 'asc' | 'desc'
}

// 统计
const stats = ref({ totalProjects: 0, inProgress: 0, delayed: 0, completed: 0, totalBudget: 0 })

// 合同列表
const contractOptions = ref<any[]>([])

// 新增
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({ name: '', contractId: '', budget: 0, startDate: '', endDate: '', remark: '' })

// 编辑
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 删除
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

// 复制
const duplicateLoading = ref(false)

// 状态颜色条映射（用于列表左侧色条，与 StatusBadge 无关）
const statusDotColor: Record<string, string> = {
  not_started: 'bg-surface-hover',
  in_progress: 'bg-brand-400',
  completed: 'bg-teal-400',
  delayed: 'bg-danger-400',
}

const statCards = [
  { key: 'in_progress', label: '进行中', color: 'border-brand-400', bg: 'bg-brand-50', icon: 'i-lucide-play', val: () => stats.value.inProgress, filterVal: 'in_progress' },
  { key: 'delayed', label: '已延期', color: 'border-red-400', bg: 'bg-danger-50', icon: 'i-lucide-alert-triangle', val: () => stats.value.delayed, filterVal: 'delayed' },
  { key: 'completed', label: '已完成', color: 'border-teal-400', bg: 'bg-teal-50', icon: 'i-lucide-check-circle', val: () => stats.value.completed, filterVal: 'completed' },
  { key: 'budget', label: '总预算', color: 'border-brand-400', bg: 'bg-brand-50', icon: 'i-lucide-coins', val: () => formatMoney(stats.value.totalBudget), filterVal: '' },
]

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function fetchStats() {
  try {
    const res = await $api('/api/projects/stats') as any
    if (res?.code === 0) stats.value = res.data
  } catch { /* ignore */ }
}

async function fetchContracts() {
  try {
    const res = await $api('/api/contracts', { params: { pageSize: 100 } }) as any
    if (res?.code === 0) contractOptions.value = res.data.items
  } catch { /* ignore */ }
}

async function handleCreate() {
  if (!createForm.value.name) { toast.add({ title: '项目名称还没填呢', color: 'warning' }); return }
  createLoading.value = true
  try {
    const body: any = { name: createForm.value.name, startDate: createForm.value.startDate || undefined, endDate: createForm.value.endDate || undefined, budget: createForm.value.budget, remark: createForm.value.remark || undefined }
    if (createForm.value.contractId) body.contractId = createForm.value.contractId
    const res = await $api('/api/projects', { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！项目已创建', color: 'success' })
      showCreateModal.value = false; resetCreateForm(); fetchProjects(); fetchStats()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { createLoading.value = false }
}

function openEditModal(p: any) {
  editForm.value = {
    id: p.id, name: p.name, budget: p.budget || 0, status: p.status,
    startDate: p.startDate || '', endDate: p.endDate || '', remark: p.remark || '',
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) { toast.add({ title: '项目名称不能为空', color: 'warning' }); return }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/projects/${id}`, { method: 'PUT', body: data }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchProjects(); fetchStats() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/projects/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchProjects(); fetchStats() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

async function handleDuplicate(p: any) {
  duplicateLoading.value = true
  try {
    const res = await $api(`/api/projects/${p.id}/duplicate`, { method: 'POST', body: { name: `${p.name} - 副本` } }) as any
    if (res?.code === 0) {
      toast.add({ title: '项目已复制', color: 'success' })
      fetchProjects(); fetchStats()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '复制失败', color: 'error' }) }
  finally { duplicateLoading.value = false }
}

function resetCreateForm() { createForm.value = { name: '', contractId: '', budget: 0, startDate: '', endDate: '', remark: '' } }

function onStatCardClick(card: typeof statCards[number]) {
  if (!card.filterVal) return
  statusFilter.value = statusFilter.value === card.filterVal ? '' : card.filterVal
}

onMounted(() => { fetchProjects(); fetchContracts(); fetchStats() })
</script>

<template>
  <div>
    <PageHeader title="项目" description="跟踪项目进度和任务">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-calendar-days" variant="ghost" color="neutral" size="sm" @click="$router.push('/dashboard/projects/calendar')">日历视图</UButton>
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">添加项目</UButton>
        </div>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-4 gap-3 mb-5">
      <div
        v-for="card in statCards" :key="card.key"
        :class="['em-card p-3 cursor-pointer hover:shadow-sm transition-shadow border-l-2', card.color, card.filterVal ? '' : 'cursor-default']"
        @click="onStatCardClick(card)"
      >
        <div class="flex items-center gap-2 mb-1">
          <div :class="['w-7 h-7 rounded-md flex items-center justify-center', card.bg]">
            <UIcon :name="card.icon" class="w-4 h-4 text-content-secondary" />
          </div>
          <span class="text-xs text-content-secondary">{{ card.label }}</span>
        </div>
        <p class="text-lg font-medium text-content-primary ml-9">{{ card.val() }}</p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
        <input v-model="keyword" type="text" placeholder="搜项目名称..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="statusFilter" dict="projectStatus" placeholder="全部状态" />
      <select :value="currentSortKey" class="input-base text-xs" @change="onSortChange(($event.target as HTMLSelectElement).value)">
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <span class="text-xs text-content-secondary">共 {{ total }} 个项目</span>
    </div>

    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="projectsList.length === 0" class="text-center py-12 text-content-secondary">还没有项目，创建第一个？</div>
    <div v-else class="space-y-1">
      <div v-for="p in projectsList" :key="p.id" class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer group" @click="$router.push(`/dashboard/projects/${p.id}`)">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', statusDotColor[p.status] || 'bg-line']" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ p.name }}</span>
            <StatusBadge :value="p.status" enum-type="ProjectStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-secondary">
            <span v-if="p.owner?.name"><UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ p.owner.name }}</span>
            <span v-if="p.startDate || p.endDate"><UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />{{ p.startDate || '-' }} ~ {{ p.endDate || '-' }}</span>
            <span v-if="p.contract?.name" class="text-brand-600">← {{ p.contract.name }}</span>
          </div>
        </div>
        <div v-if="p.budget" class="text-sm font-medium text-content-primary text-right min-w-[80px] flex-shrink-0">{{ formatMoney(p.budget) }}</div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(p)" />
          <UButton icon="i-lucide-copy" variant="ghost" color="neutral" size="xs" @click="handleDuplicate(p)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = p; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchProjects" @next="fetchProjects" />

    <!-- 新增弹窗 -->
    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加项目" subtitle="填写项目的基本信息和时间安排" :loading="createLoading" @confirm="handleCreate">
      <div class="space-y-4">
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">基本信息</span>
          </div>
          <div class="space-y-3">
            <div><label class="block text-sm text-content-secondary mb-1">项目名称 <span class="text-danger-600">*</span></label><input v-model="createForm.name" type="text" placeholder="给项目起个名字" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">关联合同</label><EnumSelect v-model="createForm.contractId" :options="contractOptions.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))" placeholder="不关联" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">预算</label><input v-model.number="createForm.budget" type="number" step="0.01" placeholder="0.00" class="w-full input-base focus-ring" /></div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">时间安排</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-content-secondary mb-1">开始日期</label><input v-model="createForm.startDate" type="date" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">结束日期</label><input v-model="createForm.endDate" type="date" class="w-full input-base focus-ring" /></div>
          </div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><textarea v-model="createForm.remark" rows="2" placeholder="备注..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
      </div>
    </FormModal>

    <!-- 编辑弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑项目" subtitle="修改项目基本信息和时间安排" :loading="editLoading" @confirm="handleEdit">
      <div class="space-y-4">
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">基本信息</span>
          </div>
          <div class="space-y-3">
            <div><label class="block text-sm text-content-secondary mb-1">项目名称 <span class="text-danger-600">*</span></label><input v-model="editForm.name" type="text" class="w-full input-base focus-ring" /></div>
            <div><label class="block text-sm text-content-secondary mb-1">状态</label><EnumSelect v-model="editForm.status" dict="projectStatus" placeholder="选择状态" /></div>
          </div>
        </div>
        <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
          <div class="flex items-center gap-1.5 mb-3">
            <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
            <span class="text-sm font-medium text-brand-700">预算与时间</span>
          </div>
          <div class="space-y-3">
            <div><label class="block text-sm text-content-secondary mb-1">预算</label><input v-model.number="editForm.budget" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm text-content-secondary mb-1">开始日期</label><input v-model="editForm.startDate" type="date" class="w-full input-base focus-ring" /></div>
              <div><label class="block text-sm text-content-secondary mb-1">结束日期</label><input v-model="editForm.endDate" type="date" class="w-full input-base focus-ring" /></div>
            </div>
          </div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" /></div>
      </div>
    </FormModal>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除项目「${deleteTarget?.name}」吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
