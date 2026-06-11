<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '合同', middleware: ['auth'] })

import { jsonToCsv, downloadCsv } from '~/utils/export-csv'

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
const transferToUserId = ref('')
const transferReason = ref('')
const transferLoading = ref(false)

function openTransferModal(ids: string[]) {
  transferTargetIds.value = ids
  transferToUserId.value = ''
  transferReason.value = ''
  showTransferModal.value = true
}

function openSingleTransfer(ct: any) {
  openTransferModal([ct.id])
}

async function handleTransfer() {
  if (!transferToUserId.value) {
    toast.add({ title: '新归属人还没选呢', color: 'warning' })
    return
  }
  transferLoading.value = true
  try {
    const body: any = { contractIds: transferTargetIds.value, toUserId: transferToUserId.value }
    if (transferReason.value) body.reason = transferReason.value
    const res = await $api('/api/contracts/batch-transfer', { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '转交完成', color: 'success' })
      showTransferModal.value = false
      selectedIds.value = new Set()
      fetchContracts()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '转交失败', color: 'error' })
  } finally {
    transferLoading.value = false
  }
}

// 用户列表
const userOptions = ref<{ id: string; name: string; username: string; role: string }[]>([])
const userSearchKeyword = ref('')
const userSearchLoading = ref(false)

async function loadUsers() {
  userSearchLoading.value = true
  try {
    const params: Record<string, any> = { pageSize: 200 }
    if (userSearchKeyword.value) params.keyword = userSearchKeyword.value
    const res = await $api('/api/users', { params }) as any
    if (res?.code === 0) {
      userOptions.value = res.data.items || []
    }
  } catch { /* ignore */ }
  finally { userSearchLoading.value = false }
}

let userSearchTimer: any = null
function onUserSearch() {
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(loadUsers, 250)
}

function handleExport() {
  $api('/api/contracts', { params: { pageSize: 9999 } }).then((res: any) => {
    const items = res?.data?.items || []
    const columns = [
      { key: 'code', label: '合同编号' },
      { key: 'name', label: '合同名称' },
      { key: 'customer?.name', label: '客户' },
      { key: 'totalAmount', label: '金额', format: (v: number) => '¥' + v },
      { key: 'status', label: '状态' },
    ]
    const csv = jsonToCsv(items, columns)
    downloadCsv(csv, `合同列表_${new Date().toISOString().slice(0,10)}.csv`)
  }).catch(() => {})
}

// 列表数据
const contractsList = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 搜索筛选
const keyword = ref('')
const statusFilter = ref('')

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

// 审批弹窗
const showApproveModal = ref(false)
const approveTarget = ref<any>(null)
const approveLoading = ref(false)

// 驳回弹窗
const showRejectModal = ref(false)
const rejectTarget = ref<any>(null)
const rejectLoading = ref(false)
const rejectReason = ref('')

// 合同状态
const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-stone-100 text-stone-600' },
  approved: { label: '已审批', color: 'bg-blue-50 text-blue-600' },
  in_progress: { label: '执行中', color: 'bg-amber-50 text-amber-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-red-50 text-red-600' },
}

// 付款方式
const paymentMethodLabels: Record<string, string> = {
  bank_transfer: '银行转账',
  check: '支票',
  cash: '现金',
  alipay: '支付宝',
  wechat_pay: '微信支付',
  other: '其他',
}

async function fetchContracts() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value

    const res = await $api('/api/contracts', { params }) as any
    if (res?.code === 0) {
      contractsList.value = res.data.items
      total.value = res.data.total
    }
  } catch (err: any) {
    toast.add({ title: '加载合同列表出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

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

function getStatusLabel(status: string) {
  return statusConfig[status]?.label || status
}

function getStatusColor(status: string) {
  return statusConfig[status]?.color || 'bg-stone-100 text-stone-600'
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

// 搜索防抖
let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchContracts()
  }, 300)
}

function onFilterChange() {
  page.value = 1
  fetchContracts()
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => {
  fetchContracts()
  fetchCustomers()
  loadUsers()
})
</script>

<template>
  <div>
    <!-- 页面标题 -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">合同</h1>
        <p class="text-sm text-stone-400 mt-0.5">管理合同、收款和审批</p>
      </div>
            <div class="flex items-center gap-2">
        <UButton v-if="isAdminOrManager()" icon="i-lucide-layout-template" variant="ghost" color="neutral" size="sm" @click="$router.push('/dashboard/contracts/templates')">模板</UButton>
        <UButton v-if="selectedIds.size > 0 && isAdminOrManager()" icon="i-lucide-arrow-left-right" color="warning" variant="soft" size="sm" @click="openTransferModal([...selectedIds])">批量转交 ({{ selectedIds.size }})</UButton>
        <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
        <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">
          添加合同
        </UButton>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜合同名称..."
          class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="statusFilter"
        class="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="onFilterChange"
      >
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="approved">已审批</option>
        <option value="in_progress">执行中</option>
        <option value="completed">已完成</option>
        <option value="terminated">已终止</option>
      </select>
      <span class="text-xs text-stone-400">共 {{ total }} 个合同</span>
      <label v-if="isAdminOrManager()" class="flex items-center gap-1 text-xs text-stone-400 cursor-pointer select-none ml-auto">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-stone-300 text-amber-500 focus:ring-amber-400" :checked="selectedIds.size === contractsList.length && contractsList.length > 0" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <!-- 合同列表 -->
    <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
    <div v-else-if="contractsList.length === 0" class="text-center py-12 text-stone-400">还没有合同，加一个？</div>
    <div v-else class="space-y-2">
      <div
        v-for="ct in contractsList"
        :key="ct.id"
        class="warm-card flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group"
        @click="$router.push(`/dashboard/contracts/${ct.id}`)"
      >
        <!-- 复选框 -->
        <div v-if="isAdminOrManager()" class="flex-shrink-0" @click.stop>
          <input type="checkbox" class="w-3.5 h-3.5 rounded border-stone-300 text-amber-500 focus:ring-amber-400" :checked="selectedIds.has(ct.id)" @change="toggleSelect(ct.id)" />
        </div>

        <!-- 状态色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', {
            'bg-stone-400': ct.status === 'draft',
            'bg-blue-400': ct.status === 'approved',
            'bg-amber-400': ct.status === 'in_progress',
            'bg-teal-400': ct.status === 'completed',
            'bg-red-400': ct.status === 'terminated',
          }]"
        />

        <!-- 主体 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-stone-800 truncate">{{ ct.name }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(ct.status)]">
              {{ getStatusLabel(ct.status) }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-stone-400">
            <span v-if="ct.code" class="text-stone-500 font-mono text-[11px]">{{ ct.code }}</span>
            <span v-if="ct.customer?.name">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline mr-0.5" />
              {{ ct.customer.name }}
            </span>
            <span class="font-medium">{{ formatMoney(ct.totalAmount) }}</span>
            <span v-if="ct.owner?.name" class="text-amber-600">
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
          <div class="flex items-center justify-between text-[10px] text-stone-400 mb-0.5">
            <span>回款</span>
            <span>{{ ct.paymentProgress ?? 0 }}%</span>
          </div>
          <div class="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div
              :class="['h-full rounded-full transition-all', ct.status === 'completed' ? 'bg-teal-400' : 'bg-amber-400']"
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
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-stone-400">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchContracts()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchContracts()">下一页</UButton>
      </div>
    </div>

    <!-- 新增合同弹窗 -->
    <UModal v-model:open="showCreateModal">
      <template #header>添加合同</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div>
            <label class="block text-sm text-stone-600 mb-1">合同名称 <span class="text-red-400">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="给合同起个名字" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">客户 <span class="text-red-400">*</span></label>
            <select v-model="createForm.customerId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
              <option value="">选择客户</option>
              <option v-for="c in customerOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">合同金额</label>
              <input v-model.number="createForm.totalAmount" type="number" step="0.01" placeholder="0.00" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">付款方式</label>
              <select v-model="createForm.paymentMethod" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择方式</option>
                <option v-for="(label, key) in paymentMethodLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">甲方</label>
              <input v-model="createForm.partyA" type="text" placeholder="甲方名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">乙方</label>
              <input v-model="createForm.partyB" type="text" placeholder="乙方名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">开始日期</label>
              <input v-model="createForm.startDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">结束日期</label>
              <input v-model="createForm.endDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <textarea v-model="createForm.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showCreateModal = false">取消</UButton>
          <UButton color="primary" :loading="createLoading" @click="handleCreate">添加</UButton>
        </div>
      </template>
    </UModal>

    <!-- 编辑合同弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑合同</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div>
            <label class="block text-sm text-stone-600 mb-1">合同名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">合同金额</label>
              <input v-model.number="editForm.totalAmount" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">付款方式</label>
              <select v-model="editForm.paymentMethod" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择方式</option>
                <option v-for="(label, key) in paymentMethodLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">甲方</label>
              <input v-model="editForm.partyA" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">乙方</label>
              <input v-model="editForm.partyB" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">开始日期</label>
              <input v-model="editForm.startDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">结束日期</label>
              <input v-model="editForm.endDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showEditModal = false">取消</UButton>
          <UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton>
        </div>
      </template>
    </UModal>

    <!-- 审批确认弹窗 -->
    <UModal v-model:open="showApproveModal">
      <template #header>确认审批</template>
      <template #body>
        <p class="text-sm text-stone-600">
          确定要审批通过合同「{{ approveTarget?.name }}」吗？审批后将进入执行状态。
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showApproveModal = false; approveTarget = null">再想想</UButton>
          <UButton color="primary" :loading="approveLoading" @click="handleApprove">确认审批</UButton>
        </div>
      </template>
    </UModal>

    <!-- 驳回弹窗 -->
    <UModal v-model:open="showRejectModal">
      <template #header>驳回合同</template>
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-stone-600">确定要驳回「{{ rejectTarget?.name }}」吗？请填写驳回原因。</p>
          <textarea
            v-model="rejectReason"
            rows="2"
            placeholder="写明驳回原因..."
            class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showRejectModal = false; rejectTarget = null">取消</UButton>
          <UButton color="warning" :loading="rejectLoading" @click="handleReject">确认驳回</UButton>
        </div>
      </template>
    </UModal>

    <!-- 删除确认弹窗 -->
    <UModal v-model:open="showDeleteModal">
      <template #header>确认删除</template>
      <template #body>
        <p class="text-sm text-stone-600">
          {{ deleteTarget?.status === 'approved' ? '合同「' + deleteTarget?.name + '」已审批通过，管理员删除请谨慎操作。' : '确定要删除合同「' + deleteTarget?.name + '」吗？删了就找不回来了。' }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false; deleteTarget = null">再想想</UButton>
          <UButton color="error" :loading="deleteLoading" @click="handleDelete">确认删除</UButton>
        </div>
      </template>
    </UModal>

    <!-- 转交弹窗 -->
    <UModal v-model:open="showTransferModal">
      <template #header>{{ transferTargetIds.length > 1 ? `批量转交 ${transferTargetIds.length} 个合同` : '转交合同' }}</template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-stone-600 mb-2">新归属人 <span class="text-red-400">*</span></label>
            <div class="relative">
              <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
              <input
                v-model="userSearchKeyword"
                type="text"
                placeholder="搜索同事姓名..."
                class="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 bg-white"
                @input="onUserSearch"
                @focus="loadUsers"
              />
            </div>
            <div v-if="userOptions.length > 0" class="mt-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
              <button
                v-for="u in userOptions"
                :key="u.id"
                :class="[
                  'w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2',
                  transferToUserId === u.id ? 'bg-amber-50' : ''
                ]"
                @click="transferToUserId = u.id"
              >
                <span class="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span class="text-amber-700 text-[10px]">{{ u.name?.charAt(0) }}</span>
                </span>
                <span class="text-stone-700">{{ u.name }}</span>
                <span class="text-xs text-stone-400 ml-auto">{{ u.username }}</span>
                <UIcon v-if="transferToUserId === u.id" name="i-lucide-check" class="w-4 h-4 text-amber-500 ml-1" />
              </button>
            </div>
            <div v-else-if="userSearchLoading" class="mt-2 p-2 text-xs text-stone-400">加载中...</div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">转交原因</label>
            <textarea v-model="transferReason" rows="2" placeholder="可选，记录转交原因..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showTransferModal = false">取消</UButton>
          <UButton color="warning" :loading="transferLoading" :disabled="!transferToUserId" @click="handleTransfer">确认转交</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
