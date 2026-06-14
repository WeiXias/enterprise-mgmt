<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '提成', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const { loading, list: items, total, page, pageSize, totalPages, onSearchInput, onFilterChange, setFilter, fetchList: fetchItems } = useTable<any>({ apiUrl: '/api/commissions' })
const { exportCsv } = useExportCsv()

// 统计
const stats = ref({ totalAmount: 0, paidAmount: 0, pendingAmount: 0, byUser: [] as any[], byMonth: [] as any[] })

// 合同列表（计算用）
const contractOptions = ref<any[]>([])
// 规则列表
const rules = ref<any[]>([])

// 计算提成
const showCalcModal = ref(false)
const calcLoading = ref(false)
const calcForm = ref({ contractId: '' })

// 调整
const showAdjustModal = ref(false)
const adjustLoading = ref(false)
const adjustForm = ref({ id: '', adjustAmount: 0, adjustReason: '' })

// 审批
const approveLoading = ref<string | null>(null)

// 删除
const deleteTarget = ref<any>(null)
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 状态筛选
const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

function handleExport() {
  exportCsv('/api/commissions', [
    { key: 'user?.name', label: '人员' },
    { key: 'contract?.name', label: '关联合同' },
    { key: 'baseAmount', label: '基数', format: (v: unknown) => '¥' + v },
    { key: 'amount', label: '金额', format: (v: unknown) => '¥' + v },
    { key: 'status', label: '状态' },
  ], `提成列表_${new Date().toISOString().slice(0,10)}.csv`)
}

async function fetchStats() {
  try {
    const res = await $api('/api/commissions/stats') as any
    if (res?.code === 0) stats.value = res.data
  } catch { /* ignore */ }
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function fetchOptions() {
  try {
    const [cRes, rRes] = await Promise.all([
      $api('/api/contracts', { params: { pageSize: 100 } }) as any,
      $api('/api/commission-rules') as any,
    ])
    if (cRes?.code === 0) contractOptions.value = cRes.data.items
    if (rRes?.code === 0) rules.value = rRes.data
  } catch { /* ignore */ }
}

// === Calculate ===
async function handleCalc() {
  if (!calcForm.value.contractId) { toast.add({ title: '选一下合同', color: 'warning' }); return }
  calcLoading.value = true
  try {
    const res = await $api('/api/commissions/calculate', { method: 'POST', body: { contractId: calcForm.value.contractId } }) as any
    if (res?.code === 0) {
      toast.add({ title: `搞定了！生成了 ${res.data.results.length} 条提成记录`, color: 'success' })
      showCalcModal.value = false
      calcForm.value = { contractId: '' }
      fetchItems()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '计算失败', color: 'error' }) }
  finally { calcLoading.value = false }
}

// === Approve ===
async function handleApprove(id: string) {
  approveLoading.value = id
  try {
    const res = await $api(`/api/commissions/${id}/approve`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: '审批通过了！', color: 'success' }); fetchItems() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '审批失败', color: 'error' }) }
  finally { approveLoading.value = null }
}

async function handleReject(id: string) {
  const reason = prompt('驳回原因：')
  if (!reason) return
  try {
    const res = await $api(`/api/commissions/${id}/reject`, { method: 'POST', body: { reason } }) as any
    if (res?.code === 0) { toast.add({ title: '已驳回', color: 'success' }); fetchItems() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '驳回失败', color: 'error' }) }
}

// === Adjust ===
function openAdjust(item: any) {
  adjustForm.value = { id: item.id, adjustAmount: Number(item.adjustAmount) || Number(item.amount), adjustReason: '' }
  showAdjustModal.value = true
}

async function handleAdjust() {
  if (!adjustForm.value.adjustAmount) { toast.add({ title: '调整金额得填', color: 'warning' }); return }
  adjustLoading.value = true
  try {
    const res = await $api(`/api/commissions/${adjustForm.value.id}/adjust`, { method: 'PUT', body: adjustForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '提成已调整', color: 'success' }); showAdjustModal.value = false; fetchItems() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '调整失败', color: 'error' }) }
  finally { adjustLoading.value = false }
}

// === Delete ===
async function handleDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const res = await $api(`/api/commissions/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchItems()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

onMounted(() => { fetchItems(); fetchOptions(); fetchStats() })
</script>

<template>
  <div>
    <PageHeader title="提成" description="管理提成计算和审批发放">
      <template #actions>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
            <UButton icon="i-lucide-calculator" color="primary" @click="showCalcModal = true; calcForm = { contractId: '' }">计算提成</UButton>
          </div>
          <NuxtLink to="/dashboard/commissions/rules">
            <UButton icon="i-lucide-settings" variant="ghost" color="neutral" size="sm">规则设置</UButton>
          </NuxtLink>
          <NuxtLink to="/dashboard/commissions/payouts">
            <UButton icon="i-lucide-banknote" variant="ghost" color="neutral" size="sm">发放管理</UButton>
          </NuxtLink>
        </div>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-dollar-sign" class="w-5 h-5 text-brand-500" /></div>
        <div><p class="text-lg font-semibold text-content-secondary">{{ formatMoney(stats.totalAmount) }}</p><p class="text-xs text-content-muted">总提成金额</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-teal-50 flex items-center justify-center"><UIcon name="i-lucide-check-circle" class="w-5 h-5 text-teal-500" /></div>
        <div><p class="text-lg font-semibold text-teal-600">{{ formatMoney(stats.paidAmount) }}</p><p class="text-xs text-content-muted">已发放</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center"><UIcon name="i-lucide-clock" class="w-5 h-5 text-brand-400" /></div>
        <div><p class="text-lg font-semibold text-brand-600">{{ formatMoney(stats.pendingAmount) }}</p><p class="text-xs text-content-muted">待审批</p></div>
      </div>
      <div class="em-card flex items-center gap-3 !py-3">
        <div class="w-10 h-10 rounded-md bg-surface-hover flex items-center justify-center"><UIcon name="i-lucide-users" class="w-5 h-5 text-content-muted" /></div>
        <div><p class="text-lg font-semibold text-content-secondary">{{ stats.byUser.length }}</p><p class="text-xs text-content-muted">涉及人员</p></div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <select v-model="statusFilter" class="input-base focus-ring">
        <option value="">全部状态</option>
        <option value="pending">待审批</option>
        <option value="approved">已通过</option>
        <option value="rejected">已驳回</option>
        <option value="paid">已发放</option>
      </select>
      <span class="text-xs text-content-muted">共 {{ total }} 条提成记录</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">还没有提成记录，先计算一单？</div>
    <div v-else class="space-y-2">
      <NuxtLink v-for="c in items" :key="c.id" :to="`/dashboard/commissions/${c.id}`" class="em-card flex items-center gap-4 hover:shadow-sm transition-shadow group">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-secondary">{{ c.user?.name }} - {{ c.contract?.name }}</span>
            <StatusBadge :value="c.status" enum-type="commissionStatus" />
          </div>
          <div class="flex items-center gap-4 text-xs text-content-muted">
            <span>基数 {{ formatMoney(c.baseAmount) }}</span>
            <span>比例 {{ (Number(c.rate) * 100).toFixed(1) }}%</span>
            <span class="font-medium text-content-secondary">{{ formatMoney(Number(c.adjustAmount) || Number(c.amount)) }}</span>
            <span v-if="c.adjustReason" class="text-brand-600">（已调整：{{ c.adjustReason }}）</span>
            <span>{{ c.periodMonth }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <template v-if="c.status === 'pending'">
            <UButton icon="i-lucide-check" color="primary" variant="ghost" size="xs" :loading="approveLoading === c.id" @click="handleApprove(c.id)">通过</UButton>
            <UButton icon="i-lucide-x" color="warning" variant="ghost" size="xs" @click="handleReject(c.id)">驳回</UButton>
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="xs" @click="openAdjust(c)">调整</UButton>
          </template>
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteTarget = c; showDeleteModal = true" />
        </div>
      </NuxtLink>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchItems" @next="fetchItems" />

    <!-- 计算弹窗 -->
    <FormModal v-if="showCalcModal" v-model:open="showCalcModal" title="计算提成" size="compact" :loading="calcLoading" @confirm="handleCalc" @cancel="showCalcModal = false">
        <div class="space-y-3">
          <p class="text-sm text-content-secondary">选择合同，根据已配置的提成规则自动计算。</p>
          <div>
            <label class="block text-sm text-content-secondary mb-1">合同 <span class="text-red-400">*</span></label>
            <select v-model="calcForm.contractId" class="w-full input-base focus-ring">
              <option value="">选择合同</option>
              <option v-for="c in contractOptions" :key="c.id" :value="c.id">{{ c.name }} ({{ c.code }}) - {{ formatMoney(c.totalAmount) }}</option>
            </select>
          </div>
          <div v-if="rules.length === 0" class="text-xs text-brand-600 bg-brand-50 p-2 rounded-md">还没有提成规则，请先去「规则设置」配置。</div>
          <div v-else class="text-xs text-content-muted">
            当前 {{ rules.length }} 条生效规则：
            <span v-for="r in rules" :key="r.id" class="ml-2">{{ r.name }}({{ (Number(r.rate) * 100).toFixed(1) }}%)</span>
          </div>
        </div>
    </FormModal>

    <!-- 调整弹窗 -->
    <FormModal v-if="showAdjustModal" v-model:open="showAdjustModal" title="调整提成" size="compact" :loading="adjustLoading" @confirm="handleAdjust" @cancel="showAdjustModal = false">
        <form class="space-y-3" @submit.prevent="handleAdjust">
          <div>
            <label class="block text-sm text-content-secondary mb-1">调整后金额 <span class="text-red-400">*</span></label>
            <input v-model.number="adjustForm.adjustAmount" type="number" step="0.01" class="w-full input-base focus-ring" />
          </div>
          <div>
            <label class="block text-sm text-content-secondary mb-1">调整原因</label>
            <input v-model="adjustForm.adjustReason" type="text" placeholder="说明调整原因..." class="w-full input-base focus-ring" />
          </div>
        </form>
    </FormModal>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除「${deleteTarget?.user?.name} - ${deleteTarget?.contract?.name}」的提成记录吗？删了就找不回来了。`"
      confirm-text="确认删除"
      cancel-text="取消"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>