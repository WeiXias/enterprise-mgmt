<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '客户', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const { isAdminOrManager } = useCustomer()
const { industryOptions } = useDictIndustry()

const { loading, list: customers, total, page, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchCustomers } = useTable<any>({ apiUrl: '/api/customers' })

const statusFilter = ref('')
const industryFilter = ref('')
const sortBy = ref('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })
watch(industryFilter, (v) => { setFilter('industry', v); onFilterChange() })
watch([sortBy, sortOrder], () => { setFilter('sortBy', sortBy.value); setFilter('sortOrder', sortOrder.value); onFilterChange() })

const hasActiveFilters = computed(() => !!(keyword.value || statusFilter.value || industryFilter.value || sortBy.value !== 'updatedAt' || sortOrder.value !== 'desc'))

function clearFilters() {
  keyword.value = ''
  statusFilter.value = ''
  industryFilter.value = ''
  sortBy.value = 'updatedAt'
  sortOrder.value = 'desc'
  setFilter('keyword', undefined)
  setFilter('status', undefined)
  setFilter('industry', undefined)
  setFilter('sortBy', 'updatedAt')
  setFilter('sortOrder', 'desc')
  onFilterChange()
}

const stats = ref({ total: 0, newThisMonth: 0, oppTotal: 0, oppTotalAmount: 0 })

async function fetchStats() {
  try {
    const res = await $api('/api/customers/stats') as any
    if (res?.code === 0) {
      const d = res.data
      stats.value = { total: d.total, newThisMonth: d.newThisMonth, oppTotal: d.oppTotal, oppTotalAmount: d.oppTotalAmount }
    }
  } catch { /* 统计加载失败不影响列表 */ }
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

const sortOptions = [
  { label: '名称 A-Z', value: 'name:asc' },
  { label: '名称 Z-A', value: 'name:desc' },
  { label: '最近更新', value: 'updatedAt:desc' },
  { label: '最早更新', value: 'updatedAt:asc' },
  { label: '最近创建', value: 'createdAt:desc' },
  { label: '最早创建', value: 'createdAt:asc' },
]

const currentSortKey = computed(() => `${sortBy.value}:${sortOrder.value}`)

function onSortChange(val: string) {
  const [by = 'updatedAt', order = 'desc'] = val.split(':')
  sortBy.value = by
  sortOrder.value = order as 'asc' | 'desc'
}

const { exportCsv } = useExportCsv()

const selectedIds = ref<Set<string>>(new Set())
function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  selectedIds.value = next
}
function toggleSelectAll() {
  if (selectedIds.value.size === customers.value.length) selectedIds.value = new Set()
  else selectedIds.value = new Set(customers.value.map((c: any) => c.id))
}

const showTransferModal = ref(false)
const transferTargetIds = ref<string[]>([])
function openTransferModal(ids: string[]) { transferTargetIds.value = ids; showTransferModal.value = true }
function openSingleTransfer(customer: any) { openTransferModal([customer.id]) }

function handleExport() {
  exportCsv('/api/customers', [
    { key: 'name', label: '客户名称' }, { key: 'industry', label: '行业' },
    { key: 'status', label: '状态' }, { key: 'owner?.name', label: '负责人' },
    { key: 'createdAt', label: '创建时间', format: (v: unknown) => String(v)?.slice(0, 10) || '' },
  ], `客户列表_${new Date().toISOString().slice(0,10)}.csv`)
}

// 新增 / 编辑 (复用 CustomerForm)
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({ name: '', industry: '', registeredAddress: '', officeAddress: '', remark: '', contactName: '', contactPhone: '', contactEmail: '', contactPosition: '' })

const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 删除
const deleteTarget = ref<any>(null)
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

async function handleCreate() {
  if (!createForm.value.name) { toast.add({ title: '客户名称得填一下', color: 'warning' }); return }
  createLoading.value = true
  try {
    const res = await $api('/api/customers', { method: 'POST', body: createForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！客户已添加', color: 'success' })
      showCreateModal.value = false
      createForm.value = { name: '', industry: '', registeredAddress: '', officeAddress: '', remark: '', contactName: '', contactPhone: '', contactEmail: '', contactPosition: '' }
      fetchCustomers()
      fetchStats()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' }) }
  finally { createLoading.value = false }
}

function openEditModal(customer: any) {
  editForm.value = { id: customer.id, name: customer.name, industry: customer.industry || '', registeredAddress: customer.registeredAddress || '', officeAddress: customer.officeAddress || '', remark: customer.remark || '', status: customer.status }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) { toast.add({ title: '客户名称不能为空', color: 'warning' }); return }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/customers/${id}`, { method: 'PUT', body: data }) as any
    if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchCustomers(); fetchStats() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' }) }
  finally { editLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/customers/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchCustomers(); fetchStats() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

onMounted(() => { fetchCustomers(); fetchStats() })
</script>

<template>
  <div>
    <PageHeader title="客户" description="管理你的客户资源和联系人">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton v-if="selectedIds.size > 0 && isAdminOrManager()" icon="i-lucide-arrow-left-right" color="warning" variant="soft" size="sm" @click="openTransferModal([...selectedIds])">批量转交 ({{ selectedIds.size }})</UButton>
          <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; createForm = { name: '', industry: '', registeredAddress: '', officeAddress: '', remark: '', contactName: '', contactPhone: '', contactEmail: '', contactPosition: '' }">添加客户</UButton>
        </div>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-building-2" class="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.total }}</div>
          <div class="text-xs text-content-muted">客户总数</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-user-plus" class="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.newThisMonth }}</div>
          <div class="text-xs text-content-muted">本月新增</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-target" class="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ stats.oppTotal }}</div>
          <div class="text-xs text-content-muted">关联商机</div>
        </div>
      </div>
      <div class="em-card flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div class="text-lg text-content-inverse font-medium">{{ formatMoney(stats.oppTotalAmount) }}</div>
          <div class="text-xs text-content-muted">商机总金额</div>
        </div>
      </div>
    </div>

    <!-- 筛选 + 排序 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜索客户名称..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="statusFilter" dict="customerStatus" placeholder="全部状态" />
      <EnumSelect v-model="industryFilter" :options="industryOptions" placeholder="全部行业" />
      <select :value="currentSortKey" class="input-base text-xs" @change="onSortChange(($event.target as HTMLSelectElement).value)">
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 个客户</span>
      <UButton v-if="hasActiveFilters" icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="clearFilters">清除筛选</UButton>
      <label v-if="isAdminOrManager()" class="flex items-center gap-1 text-xs text-content-muted cursor-pointer select-none ml-auto">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500 focus:ring-brand-400" :checked="selectedIds.size === customers.length && customers.length > 0" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <EmptyState v-else-if="customers.length === 0" message="还没有客户，加一个？" icon="i-lucide-user-plus" action-label="添加客户" @action="showCreateModal = true" />
    <div v-else class="space-y-1">
      <CustomerListItem
        v-for="customer in customers"
        :key="customer.id"
        :customer="customer"
        :selected="selectedIds.has(customer.id)"
        :show-checkbox="isAdminOrManager()"
        @toggle="toggleSelect"
        @edit="openEditModal"
        @transfer="openSingleTransfer"
        @delete="deleteTarget = $event; showDeleteModal = true"
      />
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchCustomers" @next="fetchCustomers" />

    <!-- 新增 / 编辑弹窗使用 CustomerForm -->
    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加客户" subtitle="填写基本信息和主要联系人" size="standard" :loading="createLoading" @confirm="handleCreate" @cancel="showCreateModal = false">
      <CustomerForm v-model="createForm" mode="create" @submit="handleCreate" />
    </FormModal>

    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑客户" size="standard" :loading="editLoading" @confirm="handleEdit">
      <CustomerForm v-model="editForm" mode="edit" @submit="handleEdit" />
    </FormModal>

    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除" :message="`确定要删除客户「${deleteTarget?.name}」吗？删了就找不回来了。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />

    <TransferModal v-if="showTransferModal" v-model:open="showTransferModal" title="转交客户" api-path="/api/customers/batch-transfer" ids-key="customerIds" :target-ids="transferTargetIds" @done="selectedIds = new Set(); fetchCustomers()" />
  </div>
</template>
