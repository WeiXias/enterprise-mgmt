<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '客户', middleware: ['auth'] })

const authStore = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()

// 列表状态（useTable）
const { loading, list: customers, total, page, pageSize, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchCustomers } = useTable<any>({ apiUrl: '/api/customers' })

// 筛选
const statusFilter = ref('')
const industryFilter = ref('')

watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })
watch(industryFilter, (v) => { setFilter('industry', v); onFilterChange() })

// 导出（useExportCsv）
const { exporting, exportCsv } = useExportCsv()

function isAdminOrManager() {
  const role = authStore.user?.role
  return role === 'admin' || role === 'sales_manager'
}

// 批量选择
const selectedIds = ref<Set<string>>(new Set())

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  if (selectedIds.value.size === customers.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(customers.value.map((c: any) => c.id))
  }
}

// 转交
const showTransferModal = ref(false)
const transferTargetIds = ref<string[]>([])

function openTransferModal(ids: string[]) {
  transferTargetIds.value = ids
  showTransferModal.value = true
}

function openSingleTransfer(customer: any) {
  openTransferModal([customer.id])
}

// 导出
function handleExport() {
  exportCsv('/api/customers', [
    { key: 'name', label: '客户名称' },
    { key: 'industry', label: '行业' },
    { key: 'status', label: '状态' },
    { key: 'owner?.name', label: '负责人' },
    { key: 'createdAt', label: '创建时间', format: (v: unknown) => String(v)?.slice(0, 10) || '' },
  ], `客户列表_${new Date().toISOString().slice(0,10)}.csv`)
}

// 行业选项
const industryOptions = ref<string[]>([])
onMounted(async () => {
  try {
    const res = await $fetch("/api/dict/industry", { headers: useAuthHeaders() }) as any
    if (res?.code === 0) industryOptions.value = (res.data || []).map((o: any) => o.label)
  } catch {}
})

// 新增客户弹窗
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({
  name: '',
  industry: '',
  registeredAddress: '',
  officeAddress: '',
  remark: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactPosition: '',
})

// 编辑客户弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 删除确认
const deleteTarget = ref<any>(null)
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

async function handleCreate() {
  if (!createForm.value.name) {
    toast.add({ title: '客户名称得填一下', color: 'warning' })
    return
  }
  createLoading.value = true
  try {
    const res = await $api('/api/customers', {
      method: 'POST',
      body: createForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！客户已添加', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchCustomers()
    }
  } catch (err: any) {
    const msg = err?.data?.message || '添加出了点问题'
    toast.add({ title: msg, color: 'error' })
  } finally {
    createLoading.value = false
  }
}

function openEditModal(customer: any) {
  editForm.value = {
    id: customer.id,
    name: customer.name,
    industry: customer.industry || '',
    registeredAddress: customer.registeredAddress || '',
    officeAddress: customer.officeAddress || '',
    remark: customer.remark || '',
    status: customer.status,
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) {
    toast.add({ title: '客户名称不能为空', color: 'warning' })
    return
  }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/customers/${id}`, {
      method: 'PUT',
      body: data,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchCustomers()
    }
  } catch (err: any) {
    const msg = err?.data?.message || '保存出了点问题'
    toast.add({ title: msg, color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/customers/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchCustomers()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

function resetCreateForm() {
  createForm.value = {
    name: '', industry: '', registeredAddress: '', officeAddress: '', remark: '',
    contactName: '', contactPhone: '', contactEmail: '', contactPosition: '',
  }
}

onMounted(() => {
  fetchCustomers()
})
</script>

<template>
  <div>
    <!-- 页面标题 + 操作按钮 -->
    <CommonPageHeader title="客户" description="管理你的客户资源和联系人">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton v-if="selectedIds.size > 0 && isAdminOrManager()" icon="i-lucide-arrow-left-right" color="warning" variant="soft" size="sm" @click="openTransferModal([...selectedIds])">批量转交 ({{ selectedIds.size }})</UButton>
          <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">添加客户</UButton>
        </div>
      </template>
    </CommonPageHeader>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索客户名称..."
          class="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-colors"
          @input="onSearchInput"
        />
      </div>
      <select
        v-model="statusFilter"
        class="px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
      >
        <option value="">全部状态</option>
        <option value="potential">潜在客户</option>
        <option value="intentional">意向客户</option>
        <option value="closed">已成交</option>
        <option value="lost">已流失</option>
      </select>
      <select
        v-model="industryFilter"
        class="px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 bg-white"
      >
        <option value="">全部行业</option>
        <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
      </select>
      <span class="text-xs text-gray-400">共 {{ total }} 个客户</span>
      <label v-if="isAdminOrManager()" class="flex items-center gap-1 text-xs text-gray-400 cursor-pointer select-none ml-auto">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-400" :checked="selectedIds.size === customers.length && customers.length > 0" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <!-- 客户列表 -->
    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <EmptyState v-else-if="customers.length === 0" message="还没有客户，加一个？" icon="i-lucide-user-plus" action-label="添加客户" @action="showCreateModal = true" />
    <div v-else class="space-y-2">
      <div
        v-for="customer in customers"
        :key="customer.id"
        class="warm-card flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group"
        @click="$router.push(`/dashboard/customers/${customer.id}`)"
      >
        <!-- 复选框 -->
        <div v-if="isAdminOrManager()" class="flex-shrink-0" @click.stop>
          <input type="checkbox" class="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-400" :checked="selectedIds.has(customer.id)" @change="toggleSelect(customer.id)" />
        </div>

        <!-- 状态色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', {
            'bg-gray-300': customer.status === 'potential',
            'bg-brand-400': customer.status === 'intentional',
            'bg-teal-400': customer.status === 'closed',
            'bg-red-400': customer.status === 'lost',
          }]"
        />

        <!-- 主体信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">{{ customer.name }}</span>
            <StatusBadge :value="customer.status" enum-type="customerStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-gray-400">
            <span v-if="customer.industry">{{ customer.industry }}</span>
            <span v-if="customer.primaryContact?.name">
              <UIcon name="i-lucide-user" class="w-3 h-3 inline-block mr-0.5" />
              {{ customer.primaryContact.name }}
              <span v-if="customer.primaryContact.phone" class="ml-1">{{ customer.primaryContact.phone }}</span>
            </span>
            <span v-if="customer.owner?.name">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline-block mr-0.5" />
              {{ customer.owner.name }}
            </span>
          </div>
        </div>

        <!-- 标签 -->
        <div class="flex gap-1">
          <span
            v-for="tag in (customer.tags || []).slice(0, 2)"
            :key="tag.id"
            class="text-[10px] px-1.5 py-0.5 rounded"
            :style="{ backgroundColor: tag.color + '20', color: tag.color || '#5F5E5A' }"
          >{{ tag.name }}</span>
        </div>

        <!-- 操作 -->
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <UButton v-if="isAdminOrManager()" icon="i-lucide-arrow-left-right" variant="ghost" color="warning" size="xs" @click="openSingleTransfer(customer)" />
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(customer)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = customer; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <CommonPagination v-model:page="page" :total-pages="totalPages" @prev="fetchCustomers" @next="fetchCustomers" />

    <!-- 新增客户弹窗 -->
    <CommonFormModal
      v-model="showCreateModal"
      title="添加客户"
      subtitle="填写基本信息和主要联系人"
      size="standard"
      :loading="createLoading"
      @confirm="handleCreate"
      @cancel="resetCreateForm"
    >
      <template #default>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <!-- 基本信息组 -->
          <div class="rounded-xl border border-[var(--color-line-light)] bg-[var(--color-line-light)]/40 p-4">
            <div class="flex items-center gap-1.5 mb-3">
              <span class="w-0.5 h-3.5 rounded-full bg-[var(--color-brand-400)]" />
              <span class="text-sm font-medium text-[var(--color-brand-700)]">基本信息</span>
            </div>
            <div class="form-group mb-3">
              <label class="block text-sm text-[var(--color-content-secondary)] mb-1">客户名称 <span class="text-[var(--color-danger-600)]">*</span></label>
              <input v-model="createForm.name" type="text" placeholder="公司或个人名称" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">行业</label>
                <select v-model="createForm.industry" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)]">
                  <option value="">选择行业</option>
                  <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">注册地址</label>
                <input v-model="createForm.registeredAddress" type="text" placeholder="工商注册地址" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">办公地址</label>
                <input v-model="createForm.officeAddress" type="text" placeholder="实际办公地址" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">备注 <span class="text-[var(--color-content-muted)] ml-1 font-normal">选填</span></label>
                <input v-model="createForm.remark" type="text" placeholder="随手记点什么" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
            </div>
          </div>

          <!-- 联系人组 -->
          <div class="rounded-xl border border-[var(--color-line-light)] bg-[var(--color-line-light)]/40 p-4">
            <div class="flex items-center gap-1.5 mb-3">
              <span class="w-0.5 h-3.5 rounded-full bg-[var(--color-brand-400)]" />
              <span class="text-sm font-medium text-[var(--color-brand-700)]">主要联系人</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">姓名</label>
                <input v-model="createForm.contactName" type="text" placeholder="联系人姓名" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">职位</label>
                <input v-model="createForm.contactPosition" type="text" placeholder="职位" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">电话</label>
                <input v-model="createForm.contactPhone" type="text" placeholder="手机号" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">邮箱</label>
                <input v-model="createForm.contactEmail" type="email" placeholder="邮箱" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showCreateModal = false; resetCreateForm()">算了</UButton>
        <UButton color="primary" :loading="createLoading" @click="handleCreate">添加客户</UButton>
      </template>
    </CommonFormModal>

    <!-- 编辑客户弹窗 -->
    <CommonFormModal
      v-model="showEditModal"
      title="编辑客户"
      size="standard"
      :loading="editLoading"
      @confirm="handleEdit"
    >
      <template #default>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div class="rounded-xl border border-[var(--color-line-light)] bg-[var(--color-line-light)]/40 p-4">
            <div class="flex items-center gap-1.5 mb-3">
              <span class="w-0.5 h-3.5 rounded-full bg-[var(--color-brand-400)]" />
              <span class="text-sm font-medium text-[var(--color-brand-700)]">基本信息</span>
            </div>
            <div class="form-group mb-3">
              <label class="block text-sm text-[var(--color-content-secondary)] mb-1">客户名称 <span class="text-[var(--color-danger-600)]">*</span></label>
              <input v-model="editForm.name" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">行业</label>
                <select v-model="editForm.industry" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)]">
                  <option value="">选择行业</option>
                  <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">状态</label>
                <select v-model="editForm.status" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)]">
                  <option value="potential">潜在客户</option>
                  <option value="intentional">意向客户</option>
                  <option value="closed">已成交</option>
                  <option value="lost">已流失</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">注册地址</label>
                <input v-model="editForm.registeredAddress" type="text" placeholder="工商注册地址" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
              <div class="form-group">
                <label class="block text-sm text-[var(--color-content-secondary)] mb-1">办公地址</label>
                <input v-model="editForm.officeAddress" type="text" placeholder="实际办公地址" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
              </div>
            </div>
            <div class="form-group mb-0">
              <label class="block text-sm text-[var(--color-content-secondary)] mb-1">备注 <span class="text-[var(--color-content-muted)] ml-1 font-normal">选填</span></label>
              <input v-model="editForm.remark" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] focus:outline-none focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[var(--color-brand-400)]/15" />
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showEditModal = false">算了</UButton>
        <UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton>
      </template>
    </CommonFormModal>

    <!-- 删除确认弹窗 -->
    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除客户「${deleteTarget?.name}」吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />

    <!-- 转交弹窗 -->
    <CommonTransferModal
      v-model:open="showTransferModal"
      title="转交客户"
      api-path="/api/customers/batch-transfer"
      ids-key="customerIds"
      :target-ids="transferTargetIds"
      @done="selectedIds = new Set(); fetchCustomers()"
    />
  </div>
</template>
