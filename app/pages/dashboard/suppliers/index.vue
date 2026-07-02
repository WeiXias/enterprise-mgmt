<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '供应商', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: supplierList, total, page, pageSize, keyword,
  totalPages, onSearchInput, onFilterChange, setFilter, fetchList: fetchSuppliers,
} = useTable<any>({ apiUrl: '/api/suppliers' })

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

const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({
  name: '', code: '', contactPerson: '', phone: '', email: '',
  address: '', bankName: '', bankAccount: '', taxId: '', remark: '',
})

const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

function resetCreateForm() {
  createForm.value = {
    name: '', code: '', contactPerson: '', phone: '', email: '',
    address: '', bankName: '', bankAccount: '', taxId: '', remark: '',
  }
}

async function handleCreate() {
  if (!createForm.value.name) {
    toast.add({ title: '供应商名称得填一下', color: 'warning' })
    return
  }
  createLoading.value = true
  try {
    const res = await $api('/api/suppliers', { method: 'POST', body: createForm.value }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！供应商已添加', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchSuppliers()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' })
  } finally {
    createLoading.value = false
  }
}

function openEditModal(supplier: any) {
  editForm.value = {
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    contactPerson: supplier.contactPerson || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || '',
    bankName: supplier.bankName || '',
    bankAccount: supplier.bankAccount || '',
    taxId: supplier.taxId || '',
    status: supplier.status,
    remark: supplier.remark || '',
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) {
    toast.add({ title: '供应商名称不能为空', color: 'warning' })
    return
  }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/suppliers/${id}`, { method: 'PUT', body: data }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchSuppliers()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/suppliers/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchSuppliers()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => { fetchSuppliers() })
</script>

<template>
  <div>
    <PageHeader title="供应商" description="管好供应商，进货不踩坑">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">
          添加供应商
        </UButton>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
        <input v-model="keyword" type="text" placeholder="搜供应商名称、编码..." class="w-full pl-9 input-base focus-ring transition-colors" @input="onSearchInput" />
      </div>
      <select v-model="statusFilter" class="input-base focus-ring">
        <option value="">全部状态</option>
        <option value="active">合作中</option>
        <option value="inactive">已停用</option>
      </select>
      <select v-model="sortValue" class="input-base focus-ring min-w-[140px]">
        <option value="">默认排序</option>
        <option value="name_asc">名称 A-Z</option>
        <option value="name_desc">名称 Z-A</option>
        <option value="createdAt_desc">最近添加</option>
        <option value="createdAt_asc">最早添加</option>
      </select>
      <span class="text-xs text-content-secondary">共 {{ total }} 个供应商</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-secondary">加载中...</div>
    <div v-else-if="supplierList.length === 0" class="text-center py-12 text-content-secondary">
      <UIcon name="i-lucide-building-2" class="w-10 h-10 mx-auto mb-2 text-line" />
      <p class="text-sm">还没有供应商，先加一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="showCreateModal = true; resetCreateForm()">添加供应商</UButton>
    </div>
    <div v-else class="space-y-1">
      <div v-for="supplier in supplierList" :key="supplier.id" class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow group">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', supplier.status === 'active' ? 'bg-teal-400' : 'bg-line']" />
        <div class="flex-1 min-w-0 cursor-pointer" @click="$router.push(`/dashboard/suppliers/${supplier.id}`)">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ supplier.name }}</span>
            <span class="text-xs text-content-secondary">{{ supplier.code }}</span>
            <StatusBadge :value="supplier.status" enum-type="supplierStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-secondary">
            <span v-if="supplier.contactPerson">
              <UIcon name="i-lucide-user" class="w-3 h-3 inline-block mr-0.5" />{{ supplier.contactPerson }}
            </span>
            <span v-if="supplier.phone">
              <UIcon name="i-lucide-phone" class="w-3 h-3 inline-block mr-0.5" />{{ supplier.phone }}
            </span>
            <span v-if="supplier.email">{{ supplier.email }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEditModal(supplier)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = supplier; showDeleteModal = true" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchSuppliers" @next="fetchSuppliers" />

    <!-- 新增弹窗 -->
    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加供应商" subtitle="记一个供应商，进货不迷路" size="standard" :loading="createLoading" @confirm="handleCreate">
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">基本信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">供应商名称 <span class="text-danger-600">*</span></label>
            <input v-model="createForm.name" type="text" placeholder="供应商名称" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">编码 <span class="text-xs text-content-secondary">(自动生成)</span></label>
            <input v-model="createForm.code" type="text" placeholder="留空自动生成" class="w-full input-base focus-ring" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">联系方式</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">联系人</label>
            <input v-model="createForm.contactPerson" type="text" placeholder="联系人" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">手机</label>
            <input v-model="createForm.phone" type="text" placeholder="手机号" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">邮箱</label>
          <input v-model="createForm.email" type="email" placeholder="邮箱" class="w-full input-base focus-ring" />
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">地址</label>
          <input v-model="createForm.address" type="text" placeholder="地址" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">财务信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">开户行</label>
            <input v-model="createForm.bankName" type="text" placeholder="开户行" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">银行账号</label>
            <input v-model="createForm.bankAccount" type="text" placeholder="银行账号" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">税号</label>
          <input v-model="createForm.taxId" type="text" placeholder="纳税人识别号" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">备注</label>
        <textarea v-model="createForm.remark" rows="2" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" />
      </div>
    </FormModal>

    <!-- 编辑弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑供应商" size="standard" :loading="editLoading" @confirm="handleEdit">
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">基本信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">供应商名称 <span class="text-danger-600">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">编码</label>
            <input v-model="editForm.code" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">联系方式</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">联系人</label>
            <input v-model="editForm.contactPerson" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">手机</label>
            <input v-model="editForm.phone" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">邮箱</label>
          <input v-model="editForm.email" type="email" class="w-full input-base focus-ring" />
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">地址</label>
          <input v-model="editForm.address" type="text" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="rounded-xl border border-line-light bg-line-light/40 p-4 mt-3">
        <div class="flex items-center gap-1.5 mb-3">
          <span class="w-0.5 h-3.5 rounded-full bg-brand-400" />
          <span class="text-sm font-medium text-brand-700">财务信息</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">开户行</label>
            <input v-model="editForm.bankName" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">银行账号</label>
            <input v-model="editForm.bankAccount" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="mt-3">
          <label class="block text-sm text-content-secondary mb-1">税号</label>
          <input v-model="editForm.taxId" type="text" class="w-full input-base focus-ring" />
        </div>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">状态</label>
        <select v-model="editForm.status" class="w-full input-base focus-ring">
        <option value="active">合作中</option>
        <option value="inactive">已停用</option>
      </select>
      </div>
      <div class="mt-3">
        <label class="block text-sm text-content-secondary mb-1">备注</label>
        <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" />
      </div>
    </FormModal>

    <!-- 删除确认 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除供应商「${deleteTarget?.name}」吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
