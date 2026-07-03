<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '合同', middleware: ['auth'], watermark: true })

// 列表数据（useTable）
const { loading, list: contractsList, total, page, pageSize, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchContracts } = useTable<any>({ apiUrl: '/api/contracts' })

// 导出（useExportCsv）
const { exportCsv } = useExportCsv()

// 类型筛选
const typeFilter = ref('')
watch(typeFilter, (v) => { setFilter('type', v); onFilterChange() })

// 状态筛选（独立 ref，通过 watch 联动 useTable）
const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

// 排序
const sortValue = ref('')
watch(sortValue, (v) => {
  if (!v) {
    setFilter('sortBy', '')
    setFilter('sortOrder', '')
  } else {
    const idx = v.lastIndexOf('_')
    setFilter('sortBy', v.slice(0, idx))
    setFilter('sortOrder', v.slice(idx + 1))
  }
  onFilterChange()
})

const toast = useToast()
const { $api } = useNuxtApp()
const { can } = usePermission()

// 批量选择
const selectedIds = ref<Set<string>>(new Set())

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (selectedIds.value.size === contractsList.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(contractsList.value.map((c: any) => c.id))
  }
}

// 转交
const showTransferModal = ref(false)
const transferTargetIds = ref<string[]>([])

function openTransferModal(ids: string[]) {
  transferTargetIds.value = ids
  showTransferModal.value = true
}

function openSingleTransfer(ct: any) {
  openTransferModal([ct.id])
}

function handleExport() {
  const columns = [
    { key: 'code', label: '合同编号' },
    { key: 'name', label: '合同名称' },
    { key: 'type', label: '类型', format: (v: unknown) => v === 'purchase' ? '采购' : '销售' },
    { key: 'customer?.name', label: '客户' },
    { key: 'supplier?.name', label: '供应商' },
    { key: 'totalAmount', label: '金额', format: (v: unknown) => '¥' + v },
    { key: 'status', label: '状态' },
  ]
  exportCsv('/api/contracts', columns, `合同列表_${new Date().toISOString().slice(0,10)}.csv`)
}

// 客户列表（供创建选择）
const customerOptions = ref<any[]>([])
const supplierOptions = ref<any[]>([])

// 新增合同弹窗
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({
  type: 'sales',
  name: '',
  customerId: '',
  supplierId: '',
  totalAmount: 0,
  partyA: '',
  partyB: '',
  paymentMethod: '',
  startDate: '',
  endDate: '',
  remark: '',
})

// 编辑合同弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 删除确认
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)
const deleteMessage = computed(() =>
  deleteTarget.value?.status === 'approved'
    ? `合同「${deleteTarget.value?.name}」已审批通过，管理员删除请谨慎操作。`
    : `确定要删除合同「${deleteTarget.value?.name}」吗？删了就找不回来了。`
)

// 审批弹窗
const showApproveModal = ref(false)
const approveTarget = ref<any>(null)
const approveLoading = ref(false)

// 驳回弹窗
const showRejectModal = ref(false)
const rejectTarget = ref<any>(null)
const rejectLoading = ref(false)
const rejectReason = ref('')

const { getLabel, getOptions, ensureLoaded } = useEnum()

async function fetchCustomers() {
  try {
    const res = await $api('/api/customers', { params: { pageSize: 100 } }) as any
    if (res?.code === 0) {
      customerOptions.value = res.data.items
    }
  } catch { /* ignore */ }
}

async function handleCreate() {
  const isPurchase = createForm.value.type === 'purchase'
  if (!createForm.value.name) {
    toast.add({ title: '合同名称得填一下', color: 'warning' })
    return
  }
  if (isPurchase && !createForm.value.supplierId) {
    toast.add({ title: '供应商也得选一下', color: 'warning' })
    return
  }
  if (!isPurchase && !createForm.value.customerId) {
    toast.add({ title: '客户也得选一下', color: 'warning' })
    return
  }
  createLoading.value = true
  try {
    const body: any = {
      ...createForm.value,
      direction: isPurchase ? 'expense' : 'income',
    }
    // 根据类型，只发送对应关联字段
    if (isPurchase) { delete body.customerId }
    else { delete body.supplierId }
    const res = await $api('/api/contracts', {
      method: 'POST',
      body,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！合同已创建', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchContracts()
    }
  } catch (err: any) {
    const msg = err?.data?.message || '创建出了点问题'
    toast.add({ title: msg, color: 'error' })
  } finally {
    createLoading.value = false
  }
}

function openEditModal(ct: any) {
  editForm.value = {
    id: ct.id,
    name: ct.name,
    totalAmount: ct.totalAmount,
    partyA: ct.partyA || '',
    partyB: ct.partyB || '',
    paymentMethod: ct.paymentMethod || '',
    startDate: ct.startDate || '',
    endDate: ct.endDate || '',
    remark: ct.remark || '',
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) {
    toast.add({ title: '合同名称不能为空', color: 'warning' })
    return
  }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/contracts/${id}`, { method: 'PUT', body: data }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchContracts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存失败', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/contracts/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchContracts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

async function handleApprove() {
  if (!approveTarget.value) return
  approveLoading.value = true
  try {
    const res = await $api(`/api/contracts/${approveTarget.value.id}/approve`, { method: 'POST' }) as any
    if (res?.code === 0) {
      toast.add({ title: '审批通过了！', color: 'success' })
      showApproveModal.value = false
      approveTarget.value = null
      fetchContracts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '审批失败', color: 'error' })
  } finally {
    approveLoading.value = false
  }
}

async function handleReject() {
  if (!rejectTarget.value || !rejectReason.value) {
    toast.add({ title: '驳回原因还没填呢', color: 'warning' })
    return
  }
  rejectLoading.value = true
  try {
    const res = await $api(`/api/contracts/${rejectTarget.value.id}/reject`, {
      method: 'POST',
      body: { reason: rejectReason.value }
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已驳回', color: 'success' })
      showRejectModal.value = false
      rejectTarget.value = null
      rejectReason.value = ''
      fetchContracts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '驳回失败', color: 'error' })
  } finally {
    rejectLoading.value = false
  }
}

function resetCreateForm() {
  createForm.value = {
    type: 'sales', name: '', customerId: '', supplierId: '', totalAmount: 0,
    partyA: '', partyB: '', paymentMethod: '',
    startDate: '', endDate: '', remark: '',
  }
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

// 统计快筛
const quickFilter = ref('')
const stats = ref({ inProgressCount: 0, newThisMonth: 0, expiringSoon: 0, totalAmount: 0, salesCount: 0, salesAmount: 0, purchaseCount: 0, purchaseAmount: 0 })
function setQuickFilter(key: string) {
  quickFilter.value = quickFilter.value === key ? '' : key
  setFilter('inProgress', quickFilter.value === 'inProgress' ? '1' : undefined)
  setFilter('newThisMonth', quickFilter.value === 'newThisMonth' ? '1' : undefined)
  setFilter('expiringSoon', quickFilter.value === 'expiringSoon' ? '1' : undefined)
  onFilterChange()
}
async function fetchStats() {
  try { const res = await $fetch('/api/contracts/stats', { headers: useAuthHeaders() }) as any; if (res?.code === 0) stats.value = res.data } catch {}
}

onMounted(async () => {
  await ensureLoaded()
  fetchContracts()
  fetchStats()
  fetchCustomers()
})
</script>

<template>
  <div>
    <!-- 页面标题 -->
    <PageHeader title="合同" description="管理合同、收款和审批">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton v-if="can('contract:transfer')" icon="i-lucide-layout-template" variant="ghost" color="neutral" size="sm" @click="$router.push('/dashboard/contracts/templates')">模板</UButton>
          <UButton v-if="selectedIds.size > 0 && can('contract:transfer')" icon="i-lucide-arrow-left-right" color="warning" variant="soft" size="sm" @click="openTransferModal([...selectedIds])">批量转交 ({{ selectedIds.size }})</UButton>
          <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">
            添加合同
          </UButton>
        </div>
      </template>
    </PageHeader>

    <!-- 统计快筛卡片 -->
    <div class="grid grid-cols-4 gap-2.5 mb-4">
      <button class="em-card !p-3 text-left cursor-pointer transition-colors hover:border-brand-400" :class="quickFilter === 'inProgress' ? '!border-brand-400 ring-1 ring-brand-400/30' : ''" @click="setQuickFilter('inProgress')">
        <div class="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-play" class="w-3.5 h-3.5 text-brand-500" /></div>
        <div class="text-xl font-medium text-content-primary leading-none">{{ stats.inProgressCount }}</div>
        <div class="text-xs text-content-muted mt-1">执行中</div>
      </button>
      <button class="em-card !p-3 text-left cursor-pointer transition-colors hover:border-teal-400" :class="quickFilter === 'newThisMonth' ? '!border-teal-400 ring-1 ring-teal-400/30' : ''" @click="setQuickFilter('newThisMonth')">
        <div class="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-teal-500" /></div>
        <div class="text-xl font-medium text-content-primary leading-none">{{ stats.newThisMonth }}</div>
        <div class="text-xs text-content-muted mt-1">本月新增</div>
      </button>
      <button class="em-card !p-3 text-left cursor-pointer transition-colors hover:border-danger-400" :class="quickFilter === 'expiringSoon' ? '!border-danger-400 ring-1 ring-danger-400/30' : ''" @click="setQuickFilter('expiringSoon')">
        <div class="w-6 h-6 rounded-md bg-danger-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 text-danger-500" /></div>
        <div class="text-xl font-medium text-content-primary leading-none">{{ stats.expiringSoon }}</div>
        <div class="text-xs text-content-muted mt-1">即将到期</div>
      </button>
      <div class="em-card !p-3 text-left">
        <div class="w-6 h-6 rounded-md bg-surface-hover flex items-center justify-center mb-1"><UIcon name="i-lucide-coins" class="w-3.5 h-3.5 text-content-muted" /></div>
        <div class="text-lg font-medium text-content-primary leading-none">{{ formatMoney(stats.totalAmount) }}</div>
        <div class="text-xs text-content-muted mt-1">合同总额</div>
      </div>
    </div>

    <!-- 销售/采购统计 -->
    <div class="grid grid-cols-4 gap-2.5 mb-4">
      <div class="em-card !p-2.5 text-left">
        <div class="flex items-center gap-1.5 mb-1"><div class="w-1.5 h-1.5 rounded-full bg-teal-400" /><span class="text-xs text-content-muted">销售合同</span></div>
        <div class="text-sm font-medium text-content-primary">{{ stats.salesCount }} 个</div>
        <div class="text-xs text-teal-600">{{ formatMoney(stats.salesAmount) }}</div>
      </div>
      <div class="em-card !p-2.5 text-left">
        <div class="flex items-center gap-1.5 mb-1"><div class="w-1.5 h-1.5 rounded-full bg-orange-400" /><span class="text-xs text-content-muted">采购合同</span></div>
        <div class="text-sm font-medium text-content-primary">{{ stats.purchaseCount }} 个</div>
        <div class="text-xs text-orange-600">{{ formatMoney(stats.purchaseAmount) }}</div>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜合同名称..."
          class="w-full pl-9 input-base focus-ring transition-colors"
          @input="onSearchInput"
        />
      </div>
      <div class="flex items-center gap-0.5 bg-surface-hover rounded-md p-0.5">
        <button
          v-for="opt in [{value:'',label:'全部'},{value:'sales',label:'销售'},{value:'purchase',label:'采购'}]"
          :key="opt.value"
          :class="[
            'px-3 py-1 text-xs rounded transition-colors',
            typeFilter === opt.value ? 'bg-surface-card text-content-primary shadow-sm font-medium' : 'text-content-muted hover:text-content-secondary'
          ]"
          @click="typeFilter = opt.value"
        >{{ opt.label }}</button>
      </div>
      <EnumSelect
        v-model="statusFilter"
        :options="[{value:'draft',label:'草稿'},{value:'approved',label:'已审批'},{value:'in_progress',label:'执行中'},{value:'completed',label:'已完成'},{value:'terminated',label:'已终止'}]"
        placeholder="全部状态"
      />
      <select v-model="sortValue" class="input-base focus-ring min-w-[140px]">
        <option value="">默认排序</option>
        <option value="totalAmount_desc">金额从高到低</option>
        <option value="totalAmount_asc">金额从低到高</option>
        <option value="endDate_asc">截止日期从近到远</option>
        <option value="endDate_desc">截止日期从远到近</option>
        <option value="updatedAt_desc">最近更新</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 个合同</span>
      <label v-if="can('contract:transfer')" class="flex items-center gap-1 text-xs text-content-muted cursor-pointer select-none ml-auto">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500 focus:ring-brand-400" :checked="selectedIds.size === contractsList.length && contractsList.length > 0" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <!-- 合同列表 -->
    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="contractsList.length === 0" class="text-center py-12 text-content-muted">还没有合同，加一个？</div>
    <div v-else class="space-y-2">
      <div
        v-for="ct in contractsList"
        :key="ct.id"
        class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer group"
        @click="$router.push(`/dashboard/contracts/${ct.id}`)"
      >
        <!-- 复选框 -->
        <div v-if="can('contract:transfer')" class="flex-shrink-0" @click.stop>
          <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500 focus:ring-brand-400" :checked="selectedIds.has(ct.id)" @change="toggleSelect(ct.id)" />
        </div>

        <!-- 状态色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', {
            'bg-gray-400': ct.status === 'draft',
            'bg-brand-400': ct.status === 'approved' || ct.status === 'in_progress',
            'bg-teal-400': ct.status === 'completed',
            'bg-red-400': ct.status === 'terminated',
          }]"
        />

        <!-- 主体 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ ct.name }}</span>
            <span
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                ct.type === 'purchase' ? 'bg-orange-50 text-orange-600' : 'bg-teal-50 text-teal-600'
              ]"
            >{{ ct.type === 'purchase' ? '采购' : '销售' }}</span>
            <StatusBadge :value="ct.status" enum-type="contractStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="ct.code" class="text-content-muted font-mono text-[11px]">{{ ct.code }}</span>
            <span v-if="ct.type === 'purchase' && ct.supplier?.name">
              <UIcon name="i-lucide-truck" class="w-3 h-3 inline mr-0.5" />
              {{ ct.supplier.name }}
            </span>
            <span v-else-if="ct.type !== 'purchase' && ct.customer?.name">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />
              {{ ct.customer.name }}
            </span>
            <span v-if="ct.owner?.name" class="text-brand-600">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ ct.owner.name }}
            </span>
            <span v-if="ct.startDate">
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />
              {{ ct.startDate }}
            </span>
          </div>
        </div>

        <!-- 金额（右对齐） -->
        <span :class="['text-sm font-medium whitespace-nowrap', ct.direction === 'expense' ? 'text-orange-500' : 'text-teal-500']">{{ formatMoney(ct.totalAmount) }}</span>

        <!-- 进度条（执行中/已完成显示） -->
        <div v-if="ct.status === 'in_progress' || ct.status === 'completed'" class="w-24">
          <div class="flex items-center justify-between text-[10px] text-content-muted mb-0.5">
            <span>回款</span>
            <span>{{ ct.paymentProgress ?? 0 }}%</span>
          </div>
          <div class="h-1 bg-surface-hover rounded-full overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all', ct.status === 'completed' ? 'bg-teal-400' : 'bg-brand-400']"
              :style="{ width: (ct.paymentProgress ?? 0) + '%' }"
            />
          </div>
        </div>

        <!-- 操作按钮（hover 显示） -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <!-- 草稿：审批（管理员可审批任意状态） -->
          <UButton
            v-if="ct.status === 'draft' || (ct.status !== 'terminated' && ct.status !== 'completed' && can('contract:manage'))"
            icon="i-lucide-check-circle"
            color="primary"
            variant="ghost"
            size="xs"
            @click="approveTarget = ct; showApproveModal = true"
          >
            审批
          </UButton>
          <!-- 已审批：驳回 -->
          <UButton
            v-if="ct.status === 'approved'"
            icon="i-lucide-x-circle"
            color="warning"
            variant="ghost"
            size="xs"
            @click="rejectTarget = ct; rejectReason = ''; showRejectModal = true"
          >
            驳回
          </UButton>

          <!-- 编辑（草稿直接编辑，管理员可编辑任意状态） -->
          <UButton
            v-if="can('contract:transfer')"
            icon="i-lucide-arrow-left-right"
            variant="ghost"
            color="warning"
            size="xs"
            @click="openSingleTransfer(ct)"
          />
          <UButton
            v-if="ct.status === 'draft' || can('contract:manage')"
            icon="i-lucide-pen-line"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="openEditModal(ct)"
          />

          <!-- 删除（草稿直接删，管理员可删任意状态） -->
          <UButton
            v-if="ct.status === 'draft' || can('contract:manage')"
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            @click="deleteTarget = ct; showDeleteModal = true"
          />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchContracts" @next="fetchContracts" />

    <!-- 新增合同弹窗 -->
    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加合同" size="standard" :loading="createLoading" @confirm="handleCreate" @cancel="showCreateModal = false">
        <form class="space-y-4" @submit.prevent="handleCreate">
          <!-- 合同类型 -->
          <div>
            <label class="block text-sm text-content-secondary mb-1">合同类型 <span class="text-red-400">*</span></label>
            <div class="flex gap-2">
              <button type="button"
                :class="['flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors', createForm.type === 'sales' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line text-content-muted hover:border-brand-200']"
                @click="createForm.type = 'sales'; createForm.supplierId = ''">销售合同</button>
              <button type="button"
                :class="['flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors', createForm.type === 'purchase' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line text-content-muted hover:border-brand-200']"
                @click="createForm.type = 'purchase'; createForm.customerId = ''">采购合同</button>
            </div>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">合同名称 <span class="text-red-400">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="给合同起个名字" class="w-full input-base focus-ring" />
          </div>
          <div v-if="createForm.type === 'purchase'">
            <label class="block text-sm text-content-secondary mb-1">供应商 <span class="text-red-400">*</span></label>
            <SupplierSelect v-model="createForm.supplierId" placeholder="选择供应商" />
          </div>
          <div v-else>
            <label class="block text-sm text-content-secondary mb-1">客户 <span class="text-red-400">*</span></label>
            <CustomerSelect v-model="createForm.customerId" placeholder="选择客户" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">合同金额</label>
              <input v-model.number="createForm.totalAmount" type="number" step="0.01" placeholder="0.00" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">付款方式</label>
              <EnumSelect v-model="createForm.paymentMethod" dict="PaymentMethod" placeholder="选择方式" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">甲方</label>
              <input v-model="createForm.partyA" type="text" placeholder="甲方名称" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">乙方</label>
              <input v-model="createForm.partyB" type="text" placeholder="乙方名称" class="w-full input-base focus-ring" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">开始日期</label>
              <div class="flex gap-1.5">
                <input v-model="createForm.startDate" type="date" class="flex-1 input-base focus-ring" />
                <UButton
                  v-for="y in [1, 3, 5]"
                  :key="y"
                  :variant="createForm.startDate ? 'ghost' : 'soft'"
                  color="neutral"
                  size="xs"
                  class="text-[10px] px-1.5"
                  @click="createForm.startDate = new Date().toISOString().slice(0, 10); createForm.endDate = new Date(new Date().setFullYear(new Date().getFullYear() + y)).toISOString().slice(0, 10)"
                >+{{ y }}年</UButton>
              </div>
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">结束日期</label>
              <input v-model="createForm.endDate" type="date" class="w-full input-base focus-ring" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">备注</label>
            <textarea v-model="createForm.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
          </div>
        </form>
    </FormModal>

    <!-- 编辑合同弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑合同" size="standard" :loading="editLoading" @confirm="handleEdit" @cancel="showEditModal = false">
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div>
            <label class="block text-sm text-content-secondary mb-1">合同名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">合同金额</label>
              <input v-model.number="editForm.totalAmount" type="number" step="0.01" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">付款方式</label>
              <EnumSelect v-model="editForm.paymentMethod" dict="PaymentMethod" placeholder="选择方式" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">甲方</label>
              <input v-model="editForm.partyA" type="text" class="w-full input-base focus-ring" />
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">乙方</label>
              <input v-model="editForm.partyB" type="text" class="w-full input-base focus-ring" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-content-secondary mb-1">开始日期</label>
              <div class="flex gap-1.5">
                <input v-model="editForm.startDate" type="date" class="flex-1 input-base focus-ring" />
                <UButton
                  v-for="y in [1, 3, 5]"
                  :key="y"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="text-[10px] px-1.5"
                  @click="editForm.startDate = new Date().toISOString().slice(0, 10); editForm.endDate = new Date(new Date().setFullYear(new Date().getFullYear() + y)).toISOString().slice(0, 10)"
                >+{{ y }}年</UButton>
              </div>
            </div>
            <div>
              <label class="block text-sm text-content-secondary mb-1">结束日期</label>
              <input v-model="editForm.endDate" type="date" class="w-full input-base focus-ring" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">备注</label>
            <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
          </div>
        </form>
    </FormModal>

    <!-- 审批确认弹窗 -->
    <ConfirmDialog v-if="showApproveModal" v-model:open="showApproveModal" title="确认审批" :message="`确定要审批通过合同「${approveTarget?.name}」吗？审批后将进入执行状态。`" :loading="approveLoading" @confirm="handleApprove" @cancel="showApproveModal = false; approveTarget = null" />
    <!-- 驳回弹窗 -->
    <FormModal v-if="showRejectModal" v-model:open="showRejectModal" title="驳回合同" size="compact" :loading="rejectLoading" @confirm="handleReject" @cancel="showRejectModal = false; rejectTarget = null">
      <p class="text-sm text-content-secondary mb-3">确定要驳回「{{ rejectTarget?.name }}」吗？请填写驳回原因。</p>
      <textarea v-model="rejectReason" rows="2" placeholder="写明驳回原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-page focus-ring resize-none" />
    </FormModal>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="deleteMessage"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 转交弹窗 -->
    <TransferModal
      v-if="showTransferModal"
      v-model:open="showTransferModal"
      title="转交合同"
      api-path="/api/contracts/batch-transfer"
      ids-key="contractIds"
      :target-ids="transferTargetIds"
      @done="selectedIds = new Set(); fetchContracts()"
    />
  </div>
</template>
