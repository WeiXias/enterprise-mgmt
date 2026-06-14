<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '供应商详情', middleware: ['auth'] })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()
const router = useRouter()

const supplier = ref<any>(null)
const loading = ref(true)

const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

const showDeleteModal = ref(false)
const deleteLoading = ref(false)

async function fetchSupplier() {
  loading.value = true
  try {
    const res = await $api(`/api/suppliers/${route.params.id}`) as any
    if (res?.code === 0) supplier.value = res.data
  } catch {
    toast.add({ title: '找不到这个供应商', color: 'error' })
    router.push('/dashboard/suppliers')
  } finally {
    loading.value = false
  }
}

function openEditModal() {
  const s = supplier.value
  editForm.value = {
    id: s.id, name: s.name, code: s.code,
    contactPerson: s.contactPerson || '', phone: s.phone || '', email: s.email || '',
    address: s.address || '', bankName: s.bankName || '', bankAccount: s.bankAccount || '',
    taxId: s.taxId || '', status: s.status, remark: s.remark || '',
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
      fetchSupplier()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/suppliers/${supplier.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      router.push('/dashboard/suppliers')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => { fetchSupplier() })
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <CommonPageHeader title="供应商详情">
      <template #actions>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/suppliers')">返回列表</UButton>
      </template>
    </CommonPageHeader>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>

    <div v-else-if="supplier" class="em-card p-6">
      <div class="flex items-center gap-3 mb-6">
        <div :class="['w-2 h-12 rounded-full', supplier.status === 'active' ? 'bg-teal-400' : 'bg-gray-300']" />
        <div>
          <h2 class="text-lg font-medium text-content-primary">{{ supplier.name }}</h2>
          <p class="text-sm text-content-muted">{{ supplier.code }}</p>
        </div>
        <StatusBadge :value="supplier.status" enum-type="supplierStatus" class="ml-auto" />
      </div>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-content-muted">联系人</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.contactPerson || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">手机</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.phone || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">邮箱</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.email || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">地址</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.address || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">开户行</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.bankName || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">银行账号</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.bankAccount || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">税号</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.taxId || '-' }}</p>
        </div>
        <div>
          <span class="text-content-muted">添加时间</span>
          <p class="text-content-secondary mt-0.5">{{ supplier.createdAt || '-' }}</p>
        </div>
      </div>

      <div v-if="supplier.remark" class="mt-4 pt-4 border-t border-line-light">
        <span class="text-sm text-content-muted">备注</span>
        <p class="text-sm text-content-secondary mt-1">{{ supplier.remark }}</p>
      </div>

      <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-line-light">
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" @click="openEditModal()">编辑</UButton>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" @click="showDeleteModal = true">删除</UButton>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <CommonFormModal
      v-if="showEditModal"
      v-model:open="showEditModal"
      title="编辑供应商"
      size="standard"
      :loading="editLoading"
      @confirm="handleEdit"
      @cancel="showEditModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleEdit">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-secondary mb-1">供应商名称 <span class="text-red-400">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">编码</label>
            <input v-model="editForm.code" type="text" class="w-full input-base focus-ring" />
          </div>
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
        <div>
          <label class="block text-sm text-content-secondary mb-1">邮箱</label>
          <input v-model="editForm.email" type="email" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">地址</label>
          <input v-model="editForm.address" type="text" class="w-full input-base focus-ring" />
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
        <div>
          <label class="block text-sm text-content-secondary mb-1">税号</label>
          <input v-model="editForm.taxId" type="text" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">状态</label>
          <select v-model="editForm.status" class="w-full input-base focus-ring">
            <option value="active">合作中</option>
            <option value="inactive">已停用</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">备注</label>
          <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
        </div>
      </form>
    </CommonFormModal>

    <!-- 删除确认 -->
    <CommonConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除供应商「${supplier?.name}」吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />
  </div>
</template>
