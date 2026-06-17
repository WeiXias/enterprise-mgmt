<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '供应商详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const supplierId = route.params.id as string

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
    const res = await $api(`/api/suppliers/${supplierId}`) as any
    if (res?.code === 0) {
      supplier.value = res.data
    }
  } catch (err: any) {
    if (err?.statusCode === 404) {
      toast.add({ title: '供应商不存在', color: 'error' })
      router.push('/dashboard/suppliers')
    } else {
      toast.add({ title: '加载出了点问题', color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

function openEditModal() {
  const s = supplier.value
  editForm.value = {
    name: s.name,
    code: s.code,
    contactPerson: s.contactPerson || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    bankName: s.bankName || '',
    bankAccount: s.bankAccount || '',
    taxId: s.taxId || '',
    status: s.status,
    remark: s.remark || '',
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
    const res = await $api(`/api/suppliers/${supplierId}`, {
      method: 'PUT',
      body: editForm.value,
    }) as any
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
    const res = await $api(`/api/suppliers/${supplierId}`, { method: 'DELETE' }) as any
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

// 合作记录时间轴数据
const timelineItems = computed(() => {
  const contracts = (supplier.value?.contracts || []).map((c: any) => ({
    id: c.id,
    date: c.createdAt?.split(' ')[0] || '',
    type: 'contract' as const,
    icon: 'i-lucide-file-text',
    title: c.name || '合同',
    subtitle: c.code,
    amount: c.totalAmount,
    status: c.status,
    link: `/dashboard/contracts/${c.id}`,
  }))
  const orders = (supplier.value?.purchaseOrders || []).map((o: any) => ({
    id: o.id,
    date: o.createdAt?.split(' ')[0] || '',
    type: 'order' as const,
    icon: 'i-lucide-shopping-cart',
    title: o.name || '采购单',
    amount: o.totalAmount,
    status: o.status,
    link: `/dashboard/purchases/${o.id}`,
  }))
  // 按日期降序混排
  return [...contracts, ...orders].sort((a, b) => b.date.localeCompare(a.date))
})

const statusLabel: Record<string, string> = {
  draft: '草稿',
  approved: '已审批',
  in_progress: '执行中',
  completed: '已完成',
  terminated: '已终止',
  pending: '待处理',
  ordered: '已下单',
  received: '已收货',
}

</script>

<template>
  <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
  <div v-else-if="!supplier" class="text-center py-12 text-content-muted">供应商不存在</div>
  <div v-else>
    <!-- 面包屑 + 操作 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2 text-sm">
        <NuxtLink to="/dashboard/suppliers" class="text-content-muted hover:text-brand-600 transition-colors">供应商</NuxtLink>
        <span class="text-content-muted">/</span>
        <span class="text-content-secondary">{{ supplier.name }}</span>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="sm" @click="openEditModal">编辑</UButton>
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/suppliers')">返回列表</UButton>
      </div>
    </div>

    <!-- 核心信息 -->
<div class="em-card mb-6">
  <div class="flex items-start gap-4">
    <div class="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
      <span class="text-brand-700 text-lg font-medium">{{ supplier.name?.charAt(0) }}</span>
    </div>
    <div class="flex-1">
      <div class="flex items-center gap-2 mb-1">
        <h2 class="text-base font-medium text-content-primary">{{ supplier.name }}</h2>
        <span :class="['text-xs px-2 py-0.5 rounded-full', supplier.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-surface-hover text-content-muted']">
          {{ supplier.status === 'active' ? '合作中' : '已停用' }}
        </span>
      </div>
      <div class="text-xs text-content-muted">{{ supplier.code }}</div>
    </div>
  </div>
</div>

<!-- 详细信息 -->
<div class="em-card mb-6">
  <h3 class="text-sm font-medium text-content-secondary mb-4">详细信息</h3>
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
</div>

    <!-- 合作记录时间轴 -->
    <div class="em-card mb-6">
      <h3 class="text-sm font-medium text-content-secondary mb-4">合作记录</h3>
      <div v-if="timelineItems.length === 0" class="text-xs text-content-muted py-4 text-center">
        暂无合作记录，去创建一份采购订单或关联一份合同吧
      </div>
      <div v-else class="space-y-0">
        <div
          v-for="(item, idx) in timelineItems"
          :key="item.id"
          class="relative pl-6 pb-4 last:pb-0"
        >
          <!-- 时间轴竖线 -->
          <div
            v-if="idx < timelineItems.length - 1"
            class="absolute left-[7px] top-4 bottom-0 w-px bg-line"
          />
          <!-- 节点圆点 -->
          <div
            :class="[
              'absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 border-line bg-surface-card flex items-center justify-center',
              item.type === 'contract' ? 'text-brand-600' : 'text-teal-600'
            ]"
          >
            <UIcon :name="item.icon" class="w-2.5 h-2.5" />
          </div>
          <!-- 内容 -->
          <NuxtLink :to="item.link" class="block hover:bg-surface-hover -mx-2 px-2 py-1 rounded-md transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-sm text-content-secondary font-medium">{{ item.title }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full" :class="item.type === 'contract' ? 'bg-brand-50 text-brand-700' : 'bg-teal-50 text-teal-700'">
                {{ item.type === 'contract' ? '合同' : '采购' }}
              </span>
              <span class="text-xs text-content-muted">{{ statusLabel[item.status] || item.status }}</span>
            </div>
            <div class="flex items-center gap-3 mt-0.5 text-xs text-content-muted">
              <span>{{ item.date }}</span>
              <span v-if="item.subtitle">{{ item.subtitle }}</span>
              <span v-if="item.amount" class="text-content-secondary">¥{{ (item.amount / 100).toFixed(2) }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex justify-end gap-2">
      <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" @click="openEditModal">编辑</UButton>
      <UButton icon="i-lucide-trash-2" variant="ghost" color="error" @click="showDeleteModal = true">删除</UButton>
    </div>

    <!-- 编辑弹窗 -->
    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑供应商" size="standard" :loading="editLoading" @confirm="handleEdit">
      <form class="space-y-4" @submit.prevent="handleEdit">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-primary mb-1">供应商名称 <span class="text-danger-500">*</span></label>
            <input v-model="editForm.name" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-primary mb-1">编码</label>
            <input v-model="editForm.code" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-primary mb-1">联系人</label>
            <input v-model="editForm.contactPerson" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-primary mb-1">手机</label>
            <input v-model="editForm.phone" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-primary mb-1">邮箱</label>
          <input v-model="editForm.email" type="email" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-primary mb-1">地址</label>
          <input v-model="editForm.address" type="text" class="w-full input-base focus-ring" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-content-primary mb-1">开户行</label>
            <input v-model="editForm.bankName" type="text" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-primary mb-1">银行账号</label>
            <input v-model="editForm.bankAccount" type="text" class="w-full input-base focus-ring" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-content-primary mb-1">税号</label>
          <input v-model="editForm.taxId" type="text" class="w-full input-base focus-ring" />
        </div>
        <div>
          <label class="block text-sm text-content-primary mb-1">状态</label>
          <select v-model="editForm.status" class="w-full input-base focus-ring">
            <option value="active">合作中</option>
            <option value="inactive">已停用</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-content-primary mb-1">备注</label>
          <textarea v-model="editForm.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-md border border-line bg-surface-card focus-ring resize-none" />
        </div>
      </form>
    </FormModal>

    <!-- 删除确认 -->
    <ConfirmDialog
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
