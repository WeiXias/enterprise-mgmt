<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '商机', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()

// 列表数据
const { loading, list: items, total, page, pageSize, totalPages, keyword, onSearchInput, onFilterChange, setFilter, fetchList: fetchOpportunities } = useTable<any>({ apiUrl: '/api/opportunities' })

// 状态筛选
const statusFilter = ref('')
watch(statusFilter, (v) => { setFilter('status', v); onFilterChange() })

// 导出
const { exportCsv } = useExportCsv()
function handleExport() {
  exportCsv('/api/opportunities', [
    { key: 'name', label: '商机名称' },
    { key: 'customer?.name', label: '客户' },
    { key: 'estimatedAmount', label: '预估金额', format: (v: unknown) => '¥' + v },
    { key: 'status', label: '状态' },
    { key: 'owner?.name', label: '负责人' },
  ], `商机列表_${new Date().toISOString().slice(0,10)}.csv`)
}

// 新增商机弹窗
const showCreateModal = ref(false)
const createLoading = ref(false)
const createForm = ref({
  name: '',
  customerId: '',
  estimatedAmount: 0,
  estimatedCloseDate: '',
  source: '',
  competitor: '',
})

// 编辑商机弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 删除确认
const deleteTarget = ref<any>(null)
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

  const { statusConfig, stageFlow, getStatusLabel, getStatusColor, canAdvance, getNextStatusLabel } = useOpportunity()

  const sourceOptions = ref<string[]>([])
  async function fetchSourceOptions() {
    try {
      const res = await $fetch('/api/dict/opportunity_source', { headers: useAuthHeaders() }) as any
      if (res?.code === 0) sourceOptions.value = (res.data || []).map((o: any) => o.label)
    } catch {}
  }

async function handleCreate() {
  if (!createForm.value.name) {
    toast.add({ title: '商机名称得填一下', color: 'warning' })
    return
  }
  if (!createForm.value.customerId) {
    toast.add({ title: '选一下客户', color: 'warning' })
    return
  }
  createLoading.value = true
  try {
    const res = await $api('/api/opportunities', {
      method: 'POST',
      body: createForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '搞定了！商机已创建', color: 'success' })
      showCreateModal.value = false
      resetCreateForm()
      fetchOpportunities()
    }
  } catch (err: any) {
    const msg = err?.data?.message || '添加出了点问题'
    toast.add({ title: msg, color: 'error' })
  } finally {
    createLoading.value = false
  }
}

function openEditModal(opp: any) {
  editForm.value = {
    id: opp.id,
    name: opp.name,
    estimatedAmount: opp.estimatedAmount || 0,
    estimatedCloseDate: opp.estimatedCloseDate || '',
    source: opp.source || '',
    competitor: opp.competitor || '',
    status: opp.status,
  }
  showEditModal.value = true
}

async function handleEdit() {
  if (!editForm.value.name) {
    toast.add({ title: '商机名称不能为空', color: 'warning' })
    return
  }
  editLoading.value = true
  try {
    const { id, ...data } = editForm.value
    const res = await $api(`/api/opportunities/${id}`, {
      method: 'PUT',
      body: data,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchOpportunities()
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
    const res = await $api(`/api/opportunities/${deleteTarget.value.id}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      deleteTarget.value = null
      fetchOpportunities()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

// 推进阶段
async function advanceStage(opp: any) {
  const currentIdx = stageFlow.indexOf(opp.status)
  if (currentIdx < 0 || currentIdx >= stageFlow.length - 1) return
  const nextStatus = stageFlow[currentIdx + 1]
  try {
    const res = await $api(`/api/opportunities/${opp.id}`, {
      method: 'PUT',
      body: { status: nextStatus },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: `已推进到「${statusConfig[nextStatus as keyof typeof statusConfig]?.label}」`, color: 'success' })
      fetchOpportunities()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '推进失败', color: 'error' })
  }
}
  // 赢单/输单弹窗（由 OpportunityWinLoseModal 组件处理）
  const showWinModal = ref(false)
  const winTarget = ref<any>(null)
  const showLoseModal = ref(false)
  const loseTarget = ref<any>(null)


function resetCreateForm() {
  createForm.value = {
    name: '', customerId: '', estimatedAmount: 0,
    estimatedCloseDate: '', source: '', competitor: '',
  }
}

function formatAmount(amount: number | null) {
  if (!amount && amount !== 0) return '-'
  return '¥' + Number(amount).toLocaleString()
}

onMounted(() => {
  fetchOpportunities()
  fetchSourceOptions()
})
</script>

<template>
  <div>
    <!-- 页面标题 + 操作按钮 -->
    <PageHeader title="商机" description="看看哪些单子快成了">
      <template #actions>
        <div class="flex items-center gap-2">
          <UButton icon="i-lucide-download" variant="ghost" color="neutral" size="sm" @click="handleExport" />
          <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; resetCreateForm()">
            添加商机
          </UButton>
        </div>
      </template>
    </PageHeader>

    <!-- 搜索筛选栏 -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜商机名..."
          class="w-full pl-9 input-base focus-ring"
          @input="onSearchInput"
        />
      </div>
      <EnumSelect
        v-model="statusFilter"
        :options="[{value:'initial_contact',label:'初步接触'},{value:'requirement_confirmed',label:'需求确认'},{value:'proposal_submitted',label:'方案提交'},{value:'business_negotiation',label:'商务谈判'},{value:'closed_won',label:'已成交'},{value:'closed_lost',label:'已输单'}]"
        placeholder="全部阶段"
      />
      <span class="text-xs text-content-muted">共 {{ total }} 个商机</span>
    </div>

    <!-- 商机列表 -->
    <div v-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-target" class="w-10 h-10 mx-auto mb-2 text-content-muted" />
      <p class="text-sm">还没有商机，加一个？</p>
      <UButton class="mt-3" size="sm" color="primary" @click="showCreateModal = true; resetCreateForm()">添加商机</UButton>
    </div>
    <div v-else class="space-y-2">
      <div
        v-for="opp in items"
        :key="opp.id"
        class="em-card flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer group"
        @click="$router.push(`/dashboard/opportunities/${opp.id}`)"
      >
        <!-- 阶段色条 -->
        <div
          :class="['w-1 h-10 rounded-full flex-shrink-0', statusConfig[opp.status]?.dotColor || 'bg-surface-hover']"
        />

        <!-- 主体信息 -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-primary truncate">{{ opp.name }}</span>
            <StatusBadge :value="opp.status" enum-type="opportunityStatus" />
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span v-if="opp.customer?.name">
              <UIcon name="i-lucide-building-2" class="w-3 h-3 inline-block mr-0.5" />
              {{ opp.customer.name }}
            </span>
            <span v-if="opp.estimatedAmount">
              <UIcon name="i-lucide-coins" class="w-3 h-3 inline-block mr-0.5" />
              {{ formatAmount(opp.estimatedAmount) }}
            </span>
            <span v-if="opp.owner?.name">
              <UIcon name="i-lucide-user-check" class="w-3 h-3 inline-block mr-0.5" />
              {{ opp.owner.name }}
            </span>
            <span v-if="opp.estimatedCloseDate">
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline-block mr-0.5" />
              {{ opp.estimatedCloseDate?.slice(0, 10) }}
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center gap-1 transition-opacity" @click.stop>
          <!-- 推进阶段 -->
          <UButton v-if="canAdvance(opp.status)" icon="i-lucide-arrow-right" variant="ghost" color="primary" size="xs" @click="advanceStage(opp)">
            {{ getNextStatusLabel(opp.status) }}
          </UButton>
          <!-- 赢单/输单（商务谈判阶段） -->
          <UButton v-if="opp.status === 'business_negotiation'" icon="i-lucide-trophy" variant="ghost" color="success" size="xs" @click="winTarget = opp; showWinModal = true">赢单</UButton>
          <UButton v-if="opp.status === 'business_negotiation'" icon="i-lucide-x-circle" variant="ghost" color="error" size="xs" @click="loseTarget = opp; showLoseModal = true">输单</UButton>
          <UDropdownMenu
            :items="[[
              { label: '编辑', icon: 'i-lucide-pen-line', onSelect: () => openEditModal(opp) },
              { label: '删除', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => { deleteTarget = opp; showDeleteModal = true } },
            ]]"
          >
            <UButton icon="i-lucide-ellipsis" variant="ghost" color="neutral" size="xs" @click.stop />
          </UDropdownMenu>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchOpportunities" @next="fetchOpportunities" />

    <!-- 新增商机弹窗 -->
    <FormModal
      v-if="showCreateModal"
      v-model:open="showCreateModal"
      title="添加商机"
      subtitle="创建新的销售机会"
      size="standard"
      :loading="createLoading"
      @confirm="handleCreate"
      @cancel="resetCreateForm"
    >
      <template #default>
        <OpportunityForm v-model="createForm" @submit="handleCreate" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="primary" :loading="createLoading" @click="handleCreate">添加</UButton>
          <UButton variant="ghost" color="neutral" @click="showCreateModal = false; resetCreateForm()">算了</UButton>
        </div>
      </template>
    </FormModal>

    <!-- 编辑商机弹窗 -->
    <FormModal
      v-if="showEditModal"
      v-model:open="showEditModal"
      title="编辑商机"
      size="standard"
      :loading="editLoading"
      @confirm="handleEdit"
    >
      <template #default>
        <OpportunityForm v-model="editForm" preselected-customer @submit="handleEdit" />
      </template>
      <template #footer>
        <UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton>
        <UButton variant="ghost" color="neutral" @click="showEditModal = false">算了</UButton>
      </template>
    </FormModal>

    <!-- 删除确认 -->
    <ConfirmDialog v-if="showDeleteModal" v-model:open="showDeleteModal" title="确认删除商机" :message="`确定要删除商机「${deleteTarget?.name}」吗？删了就找不回来了。`" confirm-text="确认删除" cancel-text="再想想" :loading="deleteLoading" danger @confirm="handleDelete" />

    <!-- 赢单/输单弹窗 -->
    <OpportunityWinLoseModal v-model="showWinModal" mode="win" :opportunity-id="winTarget?.id" :opportunity-name="winTarget?.name" @saved="winTarget = null; fetchOpportunities()" @update:model-value="(v: boolean) => { if (!v) winTarget = null }" />
    <OpportunityWinLoseModal v-model="showLoseModal" mode="lose" :opportunity-id="loseTarget?.id" :opportunity-name="loseTarget?.name" @saved="loseTarget = null; fetchOpportunities()" @update:model-value="(v: boolean) => { if (!v) loseTarget = null }" />

  </div>
</template>
