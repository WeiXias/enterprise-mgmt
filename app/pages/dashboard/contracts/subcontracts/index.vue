<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '分包合同', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const statusFilter = ref('')

// 创建/编辑
const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ name: '', code: '', subcontractPartyId: '', totalAmount: 0, taxRate: 0, status: 'draft', startDate: '', endDate: '', remark: '' })
const partyOptions = ref<any[]>([])

// 删除
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const deleteLoading = ref(false)

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-stone-100 text-stone-600' },
  approved: { label: '已审批', color: 'bg-blue-50 text-blue-600' },
  in_progress: { label: '进行中', color: 'bg-teal-50 text-teal-700' },
  completed: { label: '已完成', color: 'bg-teal-50 text-teal-700' },
  terminated: { label: '已终止', color: 'bg-red-50 text-red-600' },
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await $api('/api/subcontracts', { params }) as any
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchParties() {
  try {
    const res = await $api('/api/subcontract-parties') as any
    if (res?.code === 0) partyOptions.value = res.data || []
  } catch { /* ignore */ }
}

function openCreate() {
  editTarget.value = null
  form.value = { name: '', code: '', subcontractPartyId: '', totalAmount: 0, taxRate: 0, status: 'draft', startDate: '', endDate: '', remark: '' }
  showModal.value = true
}

function openEdit(item: any) {
  editTarget.value = item
  form.value = {
    name: item.name, code: item.code || '', subcontractPartyId: item.subcontractPartyId || '',
    totalAmount: Number(item.totalAmount), taxRate: Number(item.taxRate) || 0,
    status: item.status, startDate: item.startDate || '', endDate: item.endDate || '', remark: item.remark || '',
  }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.name) { toast.add({ title: '合同名称还没填', color: 'warning' }); return }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/subcontracts/${editTarget.value.id}`, { method: 'PUT', body: form.value })
      toast.add({ title: '已保存', color: 'success' })
    } else {
      await $api(`/api/contracts/${form.value.subcontractPartyId || 'temp'}/subcontracts`, { method: 'POST', body: form.value })
      toast.add({ title: '分包合同已创建', color: 'success' })
    }
    showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    await $api(`/api/subcontracts/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    showDeleteModal.value = false; deleteTarget.value = null; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => { fetchItems(); fetchParties() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">分包合同</h1>
        <p class="text-sm text-stone-400 mt-0.5">管理分包合作方的合同</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/dashboard/contracts/subcontract-parties">
          <UButton icon="i-lucide-users" variant="ghost" color="neutral" size="sm">分包对象</UButton>
        </NuxtLink>
        <UButton icon="i-lucide-plus" color="primary" @click="openCreate">新建分包合同</UButton>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="flex items-center gap-3 mb-4">
      <select v-model="statusFilter" class="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white" @change="page = 1; fetchItems()">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="approved">已审批</option>
        <option value="in_progress">进行中</option>
        <option value="completed">已完成</option>
        <option value="terminated">已终止</option>
      </select>
      <span class="text-xs text-stone-400">共 {{ total }} 条</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12 text-stone-400">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-stone-400">还没有分包合同，新建一个？</div>
    <div v-else class="space-y-2">
      <NuxtLink v-for="item in items" :key="item.id" :to="`/dashboard/contracts/subcontracts/${item.id}`" class="warm-card flex items-center gap-4 hover:shadow-sm transition-shadow">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-stone-700">{{ item.name }}</span>
            <span class="text-xs text-stone-400">{{ item.code }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[item.status]?.color || '']">{{ statusConfig[item.status]?.label || item.status }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-stone-400">
            <span v-if="item.subcontractPartyName">分包方：{{ item.subcontractPartyName }}</span>
            <span>{{ formatMoney(item.totalAmount) }}</span>
            <span v-if="item.taxRate">税率 {{ Number(item.taxRate) * 100 }}%</span>
            <span v-if="item.startDate">{{ item.startDate }} ~ {{ item.endDate }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <UButton icon="i-lucide-pen-line" variant="ghost" color="neutral" size="xs" @click="openEdit(item)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = item; showDeleteModal = true" />
        </div>
      </NuxtLink>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-stone-400">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下一页</UButton>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <UModal v-model:open="showModal">
      <template #header>{{ editTarget ? '编辑' : '新建' }}分包合同</template>
      <template #body>
        <form class="space-y-3" @submit.prevent="handleSave">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">名称 <span class="text-red-400">*</span></label><input v-model="form.name" type="text" placeholder="分包合同名称" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">编码</label><input v-model="form.code" type="text" placeholder="自动生成" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          </div>
          <div>
            <label class="block text-sm text-stone-600 mb-1">分包方</label>
            <select v-model="form.subcontractPartyId" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white">
              <option value="">选择分包方</option>
              <option v-for="p in partyOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">金额</label><input v-model.number="form.totalAmount" type="number" step="0.01" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">税率</label><input v-model.number="form.taxRate" type="number" step="0.01" placeholder="0.06 = 6%" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">状态</label><select v-model="form.status" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white"><option value="draft">草稿</option><option value="in_progress">进行中</option><option value="completed">已完成</option></select></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-sm text-stone-600 mb-1">开始日期</label><input v-model="form.startDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
            <div><label class="block text-sm text-stone-600 mb-1">结束日期</label><input v-model="form.endDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" /></div>
          </div>
          <div><label class="block text-sm text-stone-600 mb-1">备注</label><textarea v-model="form.remark" rows="2" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 resize-none" /></div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2"><UButton variant="ghost" color="neutral" @click="showModal = false">取消</UButton><UButton color="primary" :loading="saving" @click="handleSave">保存</UButton></div>
      </template>
    </UModal>

    <!-- 删除确认弹窗 -->
    <CommonConfirmDialog
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除分包合同「${deleteTarget?.name}」吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
