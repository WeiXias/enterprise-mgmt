<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '合同', middleware: ['auth'], watermark: true })

// 列表数据（useTable）
const { loading, list: contractsList, total, page, pageSize, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchContracts } = useTable<any>({ apiUrl: '/api/contracts' })

// 导出（useExportCsv）
const { exportCsv } = useExportCsv()

// 状态筛选（独立 ref，通过 watch 联动 useTable）
const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

const toast = useToast()
const { $api } = useNuxtApp()
const authStore = useAuthStore()

function isAdmin() { return authStore.user?.role === 'admin' }
function isAdminOrManager() { const role = authStore.user?.role; return role === 'admin' || role === 'sales_manager' }

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
    { key: 'customer?.name', label: '客户' },
    { key: 'totalAmount', label: '金额', format: (v: unknown) => '¥' + v },
    { key: 'status', label: '状态' },
  ]
  exportCsv('/api/contracts', columns, `合同列表_${new Date().toISOString().slice(0,10)}.csv`)
}

// 客户列表（供创建选择）
const customerOptions = ref<any[]>([])

// 新增合同弹窗
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({
  name: '',
  customerId: '',
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

const { getLabel, getOptions } = useEnum()

async function fetchCustomers() {
  try {
    const res = await $api('/api/customers', { params: { pageSize: 100 } }) as any
    if (res?.code === 0) {
      customerOptions.value = res.data.items
    }
  } catch { /* ignore */ }
}

async function handleCreate() {
  if (!createForm.value.name || !createForm.value.customerId) {
    toast.add({ title: '合同名称和客户得填一下', color: 'warning' })
    return
  }
  createLoading.value = true
  try {
    const res = await $api('/api/contracts', {
      method: 'POST',
      body: createForm.value,
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
    name: '', customerId: '', totalAmount: 0,
    partyA: '', partyB: '', paymentMethod: '',
    startDate: '', endDate: '', remark: '',
  }
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

onMounted(() => {
  fetchContracts()
  fetchCustomers()
})
</script>

<template>
  <div>
    <!-- 页面标题 -->
    <PageHeader title="合同" description="管理合同、收款和审批">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton v-if="isAdminOrManager()" icon="i-lucide-layout-template" variant="ghost" color="neutral" size="sm" @click="$router.push('/dashboard/contracts/templates')">模板</UButton>
          <UButton v-if="selectedIds.size > 0 && isAdminOrManager()" icon="i-lucide-arrow-left-right" color="warning" variant="soft" size="sm" @click="openTransferModal([...selectedIds])">批量转交 ({{ selectedIds.size }})</UButton>
          <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">
            添加合同
          </UButton>
        </div>
      </template>
    </PageHeader>

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
      <EnumSelect
        v-model="statusFilter"
        :options="[{value:'draft',label:'草稿'},{value:'approved',label:'已审批'},{value:'in_progress',label:'执行中'},{value:'completed',label:'已完成'},{value:'terminated',label:'已终止'}]"
        placeholder="全部状态"
      />
      <span class="text-xs text-content-muted">共 {{ total }} 个合同</span>
      <label v-if="isAdminOrManager()" class="flex items-center gap-1 text-xs text-content-muted cursor-pointer select-none ml-auto">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-line text-brand-500 focus:ring-brand-400" :checked="selectedIds.size === contractsList.length && contractsList.length > 0" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <!-- 合同列表 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else-if="contractsList.length === 0" class="text-center py-12 text-content-muted">还没有合同，加一个？</div>
    <div v-else class="space-y-2">
      <div
        v-for="ct in contractsList"
        :key="ct.id"
        class="em-card flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group"
        @click="$router.push(`/dashboard/contracts/${ct.id}`)"
      >
        <!-- 复选框 -->
        <div v-if="isAdminOrManager()" class="flex-shrink-0" @click.stop>
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
            <StatusBadge :value="ct.status" enum-type="contractStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="ct.code" class="text-content-muted font-mono text-[11px]">{{ ct.code }}</span>
            <span v-if="ct.customer?.name">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />
              {{ ct.customer.name }}
            </span>
            <span class="font-medium">{{ formatMoney(ct.totalAmount) }}</span>
            <span v-if="ct.owner?.name" class="text-brand-600">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline mr-0.5" />{{ ct.owner.name }}
            </span>
            <span v-if="ct.startDate">
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />
              {{ ct.startDate }}
            </span>
          </div>
        </div>

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

        <!-- 操作下拉菜单 -->
        <div class="flex items-center gap-1" @click.stop>
          <!-- 草稿：审批（管理员可审批任意状态） -->
          <UButton
            v-if="ct.status === 'draft' || (ct.status !== 'terminated' && ct.status !== 'completed' && isAdmin())"
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
            v-if="isAdminOrManager()"
            icon="i-lucide-arrow-left-right"
            variant="ghost"
            color="warning"
            size="xs"
            @click="openSingleTransfer(ct)"
          />
          <UButton
            v-if="ct.status === 'draft' || isAdmin()"
            icon="i-lucide-pen-line"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="openEditModal(ct)"
          />

          <!-- 删除（草稿直接删，管理员可删任意状态） -->
          <UButton
            v-if="ct.status === 'draft' || isAdmin()"
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
          <div>
            <label class="block text-sm text-content-secondary mb-1">合同名称 <span class="text-red-400">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="给合同起个名字" class="w-full input-base focus-ring" />
          </div>
          <div>
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
