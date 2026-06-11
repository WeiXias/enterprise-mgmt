<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '客户', middleware: ['auth'] })

import { jsonToCsv, downloadCsv } from '~/utils/export-csv'

const authStore = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()
const exporting = ref(false)

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
const transferToUserId = ref('')
const transferReason = ref('')
const transferLoading = ref(false)

function openTransferModal(ids: string[]) {
  transferTargetIds.value = ids
  transferToUserId.value = ''
  transferReason.value = ''
  showTransferModal.value = true
}

function openSingleTransfer(customer: any) {
  openTransferModal([customer.id])
}

async function handleTransfer() {
  if (!transferToUserId.value) {
    toast.add({ title: '新归属人还没选呢', color: 'warning' })
    return
  }
  transferLoading.value = true
  try {
    const body: any = { customerIds: transferTargetIds.value, toUserId: transferToUserId.value }
    if (transferReason.value) body.reason = transferReason.value
    const res = await $api('/api/customers/batch-transfer', { method: 'POST', body }) as any
    if (res?.code === 0) {
      toast.add({ title: res.message || '转交完成', color: 'success' })
      showTransferModal.value = false
      selectedIds.value = new Set()
      fetchCustomers()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '转交失败', color: 'error' })
  } finally {
    transferLoading.value = false
  }
}

// 用户列表（供转交弹窗选择）
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

// 导出
function handleExport() {
  $api('/api/customers', { params: { pageSize: 9999 } }).then((res: any) => {
    const items = res?.data?.items || []
    const columns = [
      { key: 'name', label: '客户名称' },
      { key: 'industry', label: '行业' },
      { key: 'status', label: '状态' },
      { key: 'owner?.name', label: '负责人' },
      { key: 'createdAt', label: '创建时间', format: (v: string) => v?.slice(0, 10) || '' },
    ]
    const csv = jsonToCsv(items, columns)
    downloadCsv(csv, `客户列表_${new Date().toISOString().slice(0,10)}.csv`)
  }).catch(() => {})
}

const customers = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 搜索筛选
const keyword = ref('')
const statusFilter = ref('')
const industryFilter = ref('')

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

// 客户状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  potential: { label: '潜在客户', color: 'bg-stone-100 text-stone-600' },
  intentional: { label: '意向客户', color: 'bg-amber-50 text-amber-700' },
  closed: { label: '已成交', color: 'bg-teal-50 text-teal-700' },
  lost: { label: '已流失', color: 'bg-red-50 text-red-600' },
}

// 行业选项
const industryOptions = [
  '信息技术', '软件开发', '人工智能', '网络安全', '电子商务',
  '制造业', '金融', '教育', '医疗', '房地产', '物流', '其他'
]

async function fetchCustomers() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (keyword.value) params.keyword = keyword.value
    if (statusFilter.value) params.status = statusFilter.value
    if (industryFilter.value) params.industry = industryFilter.value

    const res = await $api('/api/customers', { params }) as any
    if (res?.code === 0) {
      customers.value = res.data.items
      total.value = res.data.total
    }
  } catch (err: any) {
    toast.add({ title: '加载客户列表出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

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

function getStatusLabel(status: string) {
  return statusConfig[status]?.label || status
}

function getStatusColor(status: string) {
  return statusConfig[status]?.color || 'bg-stone-100 text-stone-600'
}

// 搜索防抖
let searchTimer: any = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchCustomers()
  }, 300)
}

function onFilterChange() {
  page.value = 1
  fetchCustomers()
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => {
  fetchCustomers()
  loadUsers()
})
</script>

<template>
  <div>
    <!-- 页面标题 + 操作按钮 -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">客户</h1>
        <p class="text-sm text-stone-400 mt-0.5">管理你的客户资源和联系人</p>
      </div>
            <div class="flex items-center gap-2">
        <UButton v-if="selectedIds.size > 0 && isAdminOrManager()" icon="i-lucide-arrow-left-right" color="warning" variant="soft" size="sm" @click="openTransferModal([...selectedIds])">批量转交 ({{ selectedIds.size }})</UButton>
        <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
        <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">添加客户</UButton>
      </div>
    </div>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索客户名称..."
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
        <option value="potential">潜在客户</option>
        <option value="intentional">意向客户</option>
        <option value="closed">已成交</option>
        <option value="lost">已流失</option>
      </select>
      <select
        v-model="industryFilter"
        class="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white"
        @change="onFilterChange"
      >
        <option value="">全部行业</option>
        <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
      </select>
      <span class="text-xs text-stone-400">共 {{ total }} 个客户</span>
      <label v-if="isAdminOrManager()" class="flex items-center gap-1 text-xs text-stone-400 cursor-pointer select-none ml-auto">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-stone-300 text-amber-500 focus:ring-amber-400" :checked="selectedIds.size === customers.length && customers.length > 0" @change="toggleSelectAll" />
        全选
      </label>
    </div>

    <!-- 客户列表 -->
    <div v-if="loading" class="text-center py-12 text-stone-400">加载中...</div>
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
          <input type="checkbox" class="w-3.5 h-3.5 rounded border-stone-300 text-amber-500 focus:ring-amber-400" :checked="selectedIds.has(customer.id)" @change="toggleSelect(customer.id)" />
        </div>

        <!-- 状态色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', {
            'bg-stone-300': customer.status === 'potential',
            'bg-amber-400': customer.status === 'intentional',
            'bg-teal-400': customer.status === 'closed',
            'bg-red-400': customer.status === 'lost',
          }]"
        />

        <!-- 主体信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-stone-800 truncate">{{ customer.name }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(customer.status)]">
              {{ getStatusLabel(customer.status) }}
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs text-stone-400">
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
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-stone-400">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchCustomers()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchCustomers()">下一页</UButton>
      </div>
    </div>

    <!-- 新增客户弹窗 -->
    <UModal v-model:open="showCreateModal">
      <template #header>添加客户</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div>
            <label class="block text-sm text-stone-600 mb-1">客户名称 <span class="text-red-400">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="公司或个人名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">行业</label>
              <select v-model="createForm.industry" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择行业</option>
                <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">注册地址</label>
              <input v-model="createForm.registeredAddress" type="text" placeholder="工商注册地址" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">办公地址</label>
            <input v-model="createForm.officeAddress" type="text" placeholder="实际办公地址" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">备注</label>
            <textarea v-model="createForm.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none" />
          </div>

          <!-- 联系人信息 -->
          <div class="border-t border-stone-100 pt-4">
            <p class="text-sm text-stone-600 mb-3">主要联系人</p>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-stone-400 mb-1">姓名</label>
                  <input v-model="createForm.contactName" type="text" placeholder="联系人姓名" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label class="block text-xs text-stone-400 mb-1">职位</label>
                  <input v-model="createForm.contactPosition" type="text" placeholder="职位" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-stone-400 mb-1">电话</label>
                  <input v-model="createForm.contactPhone" type="text" placeholder="手机号" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label class="block text-xs text-stone-400 mb-1">邮箱</label>
                  <input v-model="createForm.contactEmail" type="email" placeholder="邮箱" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
                </div>
              </div>
            </div>
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

    <!-- 编辑客户弹窗 -->
    <UModal v-model:open="showEditModal">
      <template #header>编辑客户</template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleEdit">
          <div>
            <label class="block text-sm text-stone-600 mb-1">客户名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-stone-600 mb-1">行业</label>
              <select v-model="editForm.industry" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="">选择行业</option>
                <option v-for="ind in industryOptions" :key="ind" :value="ind">{{ ind }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-stone-600 mb-1">状态</label>
              <select v-model="editForm.status" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
                <option value="potential">潜在客户</option>
                <option value="intentional">意向客户</option>
                <option value="closed">已成交</option>
                <option value="lost">已流失</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">注册地址</label>
            <input v-model="editForm.registeredAddress" type="text" placeholder="工商注册地址" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">办公地址</label>
            <input v-model="editForm.officeAddress" type="text" placeholder="实际办公地址" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
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

    <!-- 删除确认弹窗 -->
    <UModal v-model:open="showDeleteModal">
      <template #header>确认删除</template>
      <template #body>
        <p class="text-sm text-stone-600">
          确定要删除客户「{{ deleteTarget?.name }}」吗？删除后数据将无法恢复。
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
      <template #header>{{ transferTargetIds.length > 1 ? `批量转交 ${transferTargetIds.length} 个客户` : '转交客户' }}</template>
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
