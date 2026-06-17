<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '报销管理', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const isFinance = computed(() => authStore.isAdmin || authStore.isFinance)

const items = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const statusFilter = ref('')

const showModal = ref(false)
const saving = ref(false)
const editTarget = ref<any>(null)
const form = ref({ type: 'office', amount: 0, reason: '', receiptUrls: '' })

const showRejectModal = ref(false)
const rejectTarget = ref<any>(null)
const rejectLoading = ref(false)
const rejectReason = ref('')

const expenseTypes = ref<any[]>([])

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-brand-50 text-brand-700' },
  approved: { label: '已通过', color: 'bg-brand-50 text-brand-600' },
  rejected: { label: '已驳回', color: 'bg-danger-50 text-danger-600' },
  paid: { label: '已付款', color: 'bg-teal-50 text-teal-700' },
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    if (statusFilter.value) params.status = statusFilter.value
    const [res, catRes] = await Promise.all([
      $api('/api/finance/reimbursements', { params }) as any,
      $api('/api/finance/categories') as any,
    ])
    if (res?.code === 0) { items.value = res.data.items; total.value = res.data.total }
    if (catRes?.code === 0) { expenseTypes.value = catRes.data.expense || [] }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function openCreate() {
  editTarget.value = null
  form.value = { type: 'office', amount: 0, reason: '', receiptUrls: '' }
  showModal.value = true
}

async function handleSave() {
  if (!form.value.amount || !form.value.reason) {
    toast.add({ title: '金额和事由都得填', color: 'warning' }); return
  }
  saving.value = true
  try {
    if (editTarget.value) {
      await $api(`/api/finance/reimbursements/${editTarget.value.id}`, { method: 'PUT', body: form.value })
      toast.add({ title: '已保存', color: 'success' })
    } else {
      await $api('/api/finance/reimbursements', { method: 'POST', body: form.value })
      toast.add({ title: '报销申请已提交', color: 'success' })
    }
    showModal.value = false; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '保存失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleApprove(id: string) {
  try {
    await $api(`/api/finance/reimbursements/${id}/approve`, { method: 'POST' })
    toast.add({ title: '审批通过了！', color: 'success' }); fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '审批失败', color: 'error' }) }
}

async function handleReject() {
  if (!rejectReason.value) { toast.add({ title: '驳回原因还没填呢', color: 'warning' }); return }
  rejectLoading.value = true
  try {
    await $api(`/api/finance/reimbursements/${rejectTarget.value.id}/reject`, { method: 'POST', body: { rejectedReason: rejectReason.value } })
    toast.add({ title: '已驳回', color: 'success' }); showRejectModal.value = false; rejectReason.value = ''; fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '驳回失败', color: 'error' }) }
  finally { rejectLoading.value = false }
}

async function handlePay(id: string) {
  try {
    await $api(`/api/finance/reimbursements/${id}/pay`, { method: 'POST', body: {} })
    toast.add({ title: '已打款', color: 'success' }); fetchItems()
  } catch (err: any) { toast.add({ title: err?.data?.message || '打款失败', color: 'error' }) }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

onMounted(() => fetchItems())
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">报销管理</h1>
        <p class="text-sm text-content-muted mt-0.5">提交和审批报销单</p>
      </div>
      <UButton icon="i-lucide-plus" color="primary" @click="openCreate">提交报销</UButton>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <EnumSelect v-model="statusFilter" dict="reimbursementStatus" placeholder="全部状态" @update:model-value="page=1; fetchItems()" />
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">还没有报销单，提交一单？</div>
    <div v-else class="space-y-2">
      <div v-for="r in items" :key="r.id" class="em-card flex items-center gap-3">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', {
          'bg-brand-400': r.status === 'pending' || r.status === 'approved',
          'bg-danger-400': r.status === 'rejected', 'bg-teal-400': r.status === 'paid'
        }]" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm text-content-secondary">{{ r.reason }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[r.status]?.color || '']">{{ statusConfig[r.status]?.label || r.status }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span>{{ formatMoney(r.amount) }}</span>
            <span>{{ r.type }}</span>
            <span v-if="r.user?.name"><UIcon name="i-lucide-user" class="w-3 h-3 inline mr-0.5" />{{ r.user.name }}</span>
            <span>{{ r.createdAt?.slice(0, 10) }}</span>
            <span v-if="r.rejectedReason" class="text-danger-500">驳回原因：{{ r.rejectedReason }}</span>
          </div>
        </div>
        <!-- 操作 -->
        <div class="flex items-center gap-1">
          <UButton v-if="r.status === 'pending' && isFinance" icon="i-lucide-check" color="primary" variant="ghost" size="xs" @click="handleApprove(r.id)">通过</UButton>
          <UButton v-if="r.status === 'pending' && isFinance" icon="i-lucide-x" color="warning" variant="ghost" size="xs" @click="rejectTarget = r; rejectReason = ''; showRejectModal = true">驳回</UButton>
          <UButton v-if="r.status === 'approved' && isFinance" icon="i-lucide-dollar-sign" color="primary" variant="ghost" size="xs" @click="handlePay(r.id)">打款</UButton>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-muted">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1"><UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchItems()">上页</UButton><UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchItems()">下页</UButton></div>
    </div>

    <!-- 提交/编辑弹窗 -->
    <FormModal
      v-if="showModal"
      v-model:open="showModal"
      :title="editTarget ? '编辑报销' : '提交报销'"
      size="standard"
      :loading="saving"
      @confirm="handleSave"
      @cancel="showModal = false"
    >
      <form class="space-y-3" @submit.prevent="handleSave">
        <div><label class="block text-sm text-content-secondary mb-1">报销类型</label><EnumSelect v-model="form.type" :options="expenseTypes.map((t: any) => t.name || t)" placeholder="选择类型" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">金额 <span class="text-danger-500">*</span></label><input v-model.number="form.amount" type="number" step="0.01" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">事由 <span class="text-danger-500">*</span></label><textarea v-model="form.reason" rows="2" placeholder="写清楚报销什么..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" /></div>
        <div>
          <label class="block text-sm text-content-secondary mb-1">凭证附件</label>
          <input type="file" multiple accept="image/*,.pdf" class="w-full text-sm text-content-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" @change="(e: Event) => { const files = (e.target as HTMLInputElement).files; if (!files) return; const urls: string[] = []; Array.from(files).forEach(f => urls.push(f.name)); form.receiptUrls = urls.join(',') }" />
          <p class="text-xs text-content-muted mt-1">支持图片和 PDF，可多选</p>
        </div>
      </form>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showModal = false">算了</UButton>
        <UButton color="primary" :loading="saving" @click="handleSave">{{ editTarget ? '保存' : '提交' }}</UButton>
      </template>
    </FormModal>

    <!-- 驳回弹窗 -->
    <FormModal
      v-if="showRejectModal"
      v-model:open="showRejectModal"
      title="驳回报销"
      size="compact"
      :loading="rejectLoading"
      @confirm="handleReject"
      @cancel="showRejectModal = false"
    >
      <div><label class="block text-sm text-content-secondary mb-1">驳回原因</label><textarea v-model="rejectReason" rows="2" placeholder="写明原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" /></div>
      <template #footer>
        <UButton variant="ghost" color="neutral" @click="showRejectModal = false">算了</UButton>
        <UButton color="warning" :loading="rejectLoading" @click="handleReject">确认驳回</UButton>
      </template>
    </FormModal>
  </div>
</template>
