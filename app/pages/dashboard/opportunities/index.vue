<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '商机', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

const { loading, list: items, total, page, pageSize, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchOpportunities } = useTable<any>({ apiUrl: '/api/opportunities' })

// 筛选
const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v || undefined); onFilterChange() })

const ownerFilter = ref('')
watch(ownerFilter, (v) => { setFilter('ownerUserId', v || undefined); onFilterChange() })

const minAmount = ref('')
const maxAmount = ref('')
watch([minAmount, maxAmount], ([min, max]) => { setFilter('minAmount', min || undefined); setFilter('maxAmount', max || undefined); onFilterChange() })

const sortBy = ref('')
const sortOrder = ref('desc')
watch([sortBy, sortOrder], ([by, order]) => { setFilter('sortBy', by || undefined); setFilter('sortOrder', by ? order : undefined); onFilterChange() })

// 快捷筛选
const quickFilter = ref('')
function setQuickFilter(key: string) {
  quickFilter.value = quickFilter.value === key ? '' : key
  setFilter('inProgress', quickFilter.value === 'inProgress' ? '1' : undefined)
  setFilter('newThisMonth', quickFilter.value === 'newThisMonth' ? '1' : undefined)
  setFilter('expiringSoon', quickFilter.value === 'expiringSoon' ? '1' : undefined)
  onFilterChange()
}

function clearFilters() {
  statusFilter.value = ''; ownerFilter.value = ''; minAmount.value = ''; maxAmount.value = ''; quickFilter.value = ''; keyword.value = ''; sortBy.value = ''; sortOrder.value = 'desc'
  setFilter('status', undefined); setFilter('ownerUserId', undefined); setFilter('minAmount', undefined); setFilter('maxAmount', undefined); setFilter('sortBy', undefined); setFilter('sortOrder', undefined); setFilter('inProgress', undefined); setFilter('newThisMonth', undefined); setFilter('expiringSoon', undefined)
  fetchOpportunities()
}
const hasActiveFilters = computed(() => statusFilter.value || ownerFilter.value || minAmount.value || maxAmount.value || quickFilter.value)

// 统计数据
interface StatsData { total: number; inProgressCount: number; wonCount: number; lostCount: number; winRate: number; totalAmount: number; newThisMonth: number; expiringSoon: number }
const stats = ref<StatsData>({ total: 0, inProgressCount: 0, wonCount: 0, lostCount: 0, winRate: 0, totalAmount: 0, newThisMonth: 0, expiringSoon: 0 })
async function fetchStats() { try { const res = await $fetch('/api/opportunities/stats', { headers: useAuthHeaders() }) as any; if (res?.code === 0) stats.value = res.data } catch {} }

// 用户列表
const userOptions = ref<{ id: string; name: string }[]>([])
async function fetchUserOptions() { try { const res = await $fetch('/api/users?pageSize=200', { headers: useAuthHeaders() }) as any; if (res?.code === 0) userOptions.value = (res.data?.items || []).map((u: any) => ({ id: u.id, name: u.name || u.username || '' })) } catch {} }

const { exportCsv } = useExportCsv()
function handleExport() { exportCsv('/api/opportunities', [{ key: 'name', label: '商机名称' },{ key: 'customer?.name', label: '客户' },{ key: 'estimatedAmount', label: '预估金额', format: (v: unknown) => '¥' + v },{ key: 'status', label: '状态' },{ key: 'owner?.name', label: '负责人' }], `商机列表_${new Date().toISOString().slice(0,10)}.csv`) }

const showCreateModal = ref(false); const createLoading = ref(false)
const createForm = ref({ name: '', customerId: '', estimatedAmount: 0, estimatedCloseDate: '', source: '', competitor: '' })
const showEditModal = ref(false); const editLoading = ref(false); const editForm = ref<any>({})
const deleteTarget = ref<any>(null); const showDeleteModal = ref(false); const deleteLoading = ref(false)

const { statusConfig, stageFlow, getStatusLabel, getStatusColor, canAdvance, getNextStatusLabel } = useOpportunity()

async function handleCreate() {
  if (!createForm.value.name) { toast.add({ title: '商机名称得填一下', color: 'warning' }); return }
  if (!createForm.value.customerId) { toast.add({ title: '选一下客户', color: 'warning' }); return }
  createLoading.value = true
  try { const res = await $api('/api/opportunities', { method: 'POST', body: createForm.value }) as any; if (res?.code === 0) { toast.add({ title: '搞定了！商机已创建', color: 'success' }); showCreateModal.value = false; resetCreateForm(); fetchOpportunities(); fetchStats() } }
  catch (err: any) { toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' }) } finally { createLoading.value = false }
}

function openEditModal(opp: any) { editForm.value = { id: opp.id, name: opp.name, estimatedAmount: opp.estimatedAmount || 0, estimatedCloseDate: opp.estimatedCloseDate || '', source: opp.source || '', competitor: opp.competitor || '', status: opp.status }; showEditModal.value = true }

async function handleEdit() {
  if (!editForm.value.name) { toast.add({ title: '商机名称不能为空', color: 'warning' }); return }
  editLoading.value = true
  try { const { id, ...data } = editForm.value; const res = await $api(`/api/opportunities/${id}`, { method: 'PUT', body: data }) as any; if (res?.code === 0) { toast.add({ title: '已保存', color: 'success' }); showEditModal.value = false; fetchOpportunities() } }
  catch (err: any) { toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' }) } finally { editLoading.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return; deleteLoading.value = true
  try { const res = await $api(`/api/opportunities/${deleteTarget.value.id}`, { method: 'DELETE' }) as any; if (res?.code === 0) { toast.add({ title: '已删除', color: 'success' }); showDeleteModal.value = false; deleteTarget.value = null; fetchOpportunities(); fetchStats() } }
  catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) } finally { deleteLoading.value = false }
}

async function advanceStage(opp: any) {
  const currentIdx = stageFlow.indexOf(opp.status); if (currentIdx < 0 || currentIdx >= stageFlow.length - 1) return
  const nextStatus = stageFlow[currentIdx + 1]
  try { const res = await $api(`/api/opportunities/${opp.id}`, { method: 'PUT', body: { status: nextStatus } }) as any; if (res?.code === 0) { toast.add({ title: `已推进到「${statusConfig[nextStatus as keyof typeof statusConfig]?.label}」`, color: 'success' }); fetchOpportunities() } }
  catch (err: any) { toast.add({ title: err?.data?.message || '推进失败', color: 'error' }) }
}

const showWinModal = ref(false); const winTarget = ref<any>(null)
const showLoseModal = ref(false); const loseTarget = ref<any>(null)

function resetCreateForm() { createForm.value = { name: '', customerId: '', estimatedAmount: 0, estimatedCloseDate: '', source: '', competitor: '' } }

function formatAmount(amount: number | null) { if (!amount && amount !== 0) return '-'; if (Math.abs(amount) >= 10000) return '¥' + (amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1) + '万'; return '¥' + Number(amount).toLocaleString() }

function stageDotClass(status: string) {
  const map: Record<string, string> = { initial_contact: 'bg-surface-muted', requirement_confirmed: 'bg-brand-400', proposal_submitted: 'bg-brand-400', business_negotiation: 'bg-brand-400', closed_won: 'bg-teal-400', closed_lost: 'bg-danger-400' }
  return map[status] || 'bg-surface-muted'
}

onMounted(() => { fetchOpportunities(); fetchStats(); fetchUserOptions() })
</script>

<template>
  <div>
    <PageHeader title="商机" description="看看哪些单子快成了">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">添加商机</UButton>
        </div>
      </template>
    </PageHeader>

    <!-- 统计快筛 -->
    <div class="grid grid-cols-4 gap-2.5 mb-4">
      <button class="em-card !p-3 text-left cursor-pointer transition-colors hover:border-brand-400" :class="quickFilter === 'inProgress' ? '!border-brand-400 ring-1 ring-brand-400/30' : ''" @click="setQuickFilter('inProgress')">
        <div class="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-play" class="w-3.5 h-3.5 text-brand-500" /></div>
        <div class="text-xl font-medium text-content-primary leading-none">{{ stats.inProgressCount }}</div><div class="text-xs text-content-muted mt-1">进行中</div>
      </button>
      <button class="em-card !p-3 text-left cursor-pointer transition-colors hover:border-teal-400" :class="quickFilter === 'newThisMonth' ? '!border-teal-400 ring-1 ring-teal-400/30' : ''" @click="setQuickFilter('newThisMonth')">
        <div class="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-teal-500" /></div>
        <div class="text-xl font-medium text-content-primary leading-none">{{ stats.newThisMonth }}</div><div class="text-xs text-content-muted mt-1">本月新增</div>
      </button>
      <button class="em-card !p-3 text-left cursor-pointer transition-colors hover:border-danger-400" :class="quickFilter === 'expiringSoon' ? '!border-danger-400 ring-1 ring-danger-400/30' : ''" @click="setQuickFilter('expiringSoon')">
        <div class="w-6 h-6 rounded-md bg-danger-50 flex items-center justify-center mb-1"><UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 text-danger-500" /></div>
        <div class="text-xl font-medium text-content-primary leading-none">{{ stats.expiringSoon }}</div><div class="text-xs text-content-muted mt-1">即将到期</div>
      </button>
      <div class="em-card !p-3 text-left"><div class="w-6 h-6 rounded-md bg-surface-hover flex items-center justify-center mb-1"><UIcon name="i-lucide-coins" class="w-3.5 h-3.5 text-content-muted" /></div><div class="text-lg font-medium text-content-primary leading-none">{{ formatAmount(stats.totalAmount) }}</div><div class="text-xs text-content-muted mt-1">预估总额</div></div>
    </div>

    <!-- 筛选栏 -->
    <div class="flex flex-wrap items-center gap-2 mb-3">
      <div class="relative flex-1 min-w-[180px] max-w-[260px]">
        <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜商机 / 客户..." class="w-full pl-8 input-base focus-ring" @input="onSearchInput" />
      </div>
      <EnumSelect v-model="statusFilter" :options="[{value:'initial_contact',label:'初步接触'},{value:'requirement_confirmed',label:'需求确认'},{value:'proposal_submitted',label:'方案提交'},{value:'business_negotiation',label:'商务谈判'},{value:'closed_won',label:'已成交'},{value:'closed_lost',label:'已输单'}]" placeholder="全部阶段" />
      <select v-model="ownerFilter" class="select-base text-sm h-9 px-2.5 rounded-md border border-line bg-white min-w-[100px]"><option value="">全部负责人</option><option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.name }}</option></select>
      <span class="text-xs text-content-muted">金额</span><input v-model="minAmount" type="number" placeholder="最低" class="input-base text-sm h-9 w-[80px] px-2 focus-ring" /><span class="text-xs text-content-muted">~</span><input v-model="maxAmount" type="number" placeholder="最高" class="input-base text-sm h-9 w-[80px] px-2 focus-ring" />
      <div class="w-px h-5 bg-line mx-0.5" />
      <select :value="`${sortBy}_${sortOrder}`" class="select-base text-sm h-9 px-2.5 rounded-md border border-line bg-white" @change="(e: any) => { const [by, order] = (e.target as HTMLSelectElement).value.split('_'); sortBy = by || ''; sortOrder = order || 'desc' }">
        <option value="_">最近更新</option>
        <option value="estimatedAmount_desc">金额: 高→低</option><option value="estimatedAmount_asc">金额: 低→高</option>
        <option value="estimatedCloseDate_asc">成交日: 近→远</option><option value="estimatedCloseDate_desc">成交日: 远→近</option>
      </select>
      <UButton v-if="hasActiveFilters" icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="clearFilters">清筛选</UButton>
      <span class="text-xs text-content-muted ml-auto">共 {{ total }} 个商机</span>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-target" class="w-10 h-10 mx-auto mb-2 text-content-muted" /><p class="text-sm">还没有商机，加一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="showCreateModal = true; resetCreateForm()">添加商机</UButton>
    </div>
    <div v-else class="space-y-1">
      <div v-for="opp in items" :key="opp.id" class="em-card !p-2.5 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer group" @click="$router.push(`/dashboard/opportunities/${opp.id}`)">
        <div :class="['w-1 h-9 rounded-full flex-shrink-0', stageDotClass(opp.status)]" />
        <div class="flex-1 min-w-0 flex items-center gap-16">
          <div class="flex items-center gap-2 min-w-0"><span class="text-sm font-medium text-content-primary truncate">{{ opp.name }}</span><StatusBadge :value="opp.status" enum-type="opportunityStatus" /></div>
          <div class="flex items-center gap-3 text-xs text-content-muted ml-auto">
            <span v-if="opp.customer?.name" class="flex items-center gap-1"><UIcon name="i-lucide-building-2" class="w-3 h-3" />{{ opp.customer.name }}</span>
            <span v-if="opp.owner?.name" class="flex items-center gap-1"><UIcon name="i-lucide-user-check" class="w-3 h-3" />{{ opp.owner.name }}</span>
            <span v-if="opp.estimatedCloseDate" class="flex items-center gap-1"><UIcon name="i-lucide-calendar" class="w-3 h-3" />{{ opp.estimatedCloseDate?.slice(5, 10) }}</span>
          </div>
        </div>
        <span class="text-sm font-medium text-brand-500 whitespace-nowrap min-w-[80px] text-right">{{ formatAmount(opp.estimatedAmount) }}</span>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
          <UButton v-if="canAdvance(opp.status)" icon="i-lucide-arrow-right" variant="ghost" color="primary" size="xs" @click="advanceStage(opp)">{{ getNextStatusLabel(opp.status) }}</UButton>
          <UButton v-if="opp.status === 'business_negotiation'" icon="i-lucide-trophy" variant="ghost" color="success" size="xs" @click="winTarget = opp; showWinModal = true">赢单</UButton>
          <UButton v-if="opp.status === 'business_negotiation'" icon="i-lucide-x-circle" variant="ghost" color="error" size="xs" @click="loseTarget = opp; showLoseModal = true">输单</UButton>
          <UDropdownMenu :items="[[{ label: '编辑', icon: 'i-lucide-pen-line', onSelect: () => openEditModal(opp) },{ label: '删除', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => { deleteTarget = opp; showDeleteModal = true } }]]">
            <UButton icon="i-lucide-ellipsis" variant="ghost" color="neutral" size="xs" @click.stop />
          </UDropdownMenu>
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchOpportunities" @next="fetchOpportunities" />

    <FormModal v-if="showCreateModal" v-model:open="showCreateModal" title="添加商机" subtitle="创建新的销售机会" size="standard" :loading="createLoading" @confirm="handleCreate" @cancel="resetCreateForm">
      <template #default><OpportunityForm v-model="createForm" @submit="handleCreate" /></template>
      <template #footer><div class="flex justify-end gap-2 w-full"><UButton color="primary" :loading="createLoading" @click="handleCreate">添加</UButton><UButton variant="ghost" color="neutral" @click="showCreateModal = false; resetCreateForm()">算了</UButton></div></template>
    </FormModal>

    <FormModal v-if="showEditModal" v-model:open="showEditModal" title="编辑商机" size="standard" :loading="editLoading" @confirm="handleEdit">
      <template #default><OpportunityForm v-model="editForm" preselected-customer @submit="handleEdit" /></template>
      <template #footer><UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton><UButton variant="ghost" color="neutral" @click="showEditModal = false">算了</UButton></template>
    </FormModal>

    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除商机" :message="`确定要删除商机「${deleteTarget?.name}」吗？删了就找不回来了。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />

    <OpportunityWinLoseModal v-model="showWinModal" mode="win" :opportunity-id="winTarget?.id" :opportunity-name="winTarget?.name" @saved="winTarget = null; fetchOpportunities(); fetchStats()" @update:model-value="(v: boolean) => { if (!v) winTarget = null }" />
    <OpportunityWinLoseModal v-model="showLoseModal" mode="lose" :opportunity-id="loseTarget?.id" :opportunity-name="loseTarget?.name" @saved="loseTarget = null; fetchOpportunities(); fetchStats()" @update:model-value="(v: boolean) => { if (!v) loseTarget = null }" />
  </div>
</template>
