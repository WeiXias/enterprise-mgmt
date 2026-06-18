<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '商机详情', middleware: ['auth'] })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { $api } = useNuxtApp()
const oppId = route.params.id as string

const opp = ref<any>(null)
const loading = ref(true)

const { statusConfig, stageFlow, getStatusLabel, getStatusColor, canAdvance, getNextStatusLabel } = useOpportunity()

const isClosed = computed(() => opp.value?.status === 'closed_won' || opp.value?.status === 'closed_lost')

// 编辑弹窗
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref<any>({})

// 赢单/输单
const showWinModal = ref(false)
const showLoseModal = ref(false)

// 删除确认
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

// 跟进记录弹窗
const showFollowUpModal = ref(false)
const followUpLoading = ref(false)
const followUpForm = ref({
  type: 'phone',
  content: '',
  nextFollowUpAt: '',
})

const sourceOptions = ref<string[]>([])
async function fetchSourceOptions() {
  try {
    const res = await $fetch('/api/dict/opportunity_source', { headers: useAuthHeaders() }) as any
    if (res?.code === 0) sourceOptions.value = (res.data || []).map((o: any) => o.label)
  } catch {}
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`) as any
    if (res?.code === 0) opp.value = res.data
  } catch (err: any) {
    toast.add({ title: '加载商机详情出了点问题', color: 'error' })
  } finally {
    loading.value = false
  }
}

function onRefresh() { fetchDetail() }

function openEditModal() {
  editForm.value = {
    name: opp.value.name,
    estimatedAmount: opp.value.estimatedAmount || 0,
    estimatedCloseDate: opp.value.estimatedCloseDate || '',
    source: opp.value.source || '',
    competitor: opp.value.competitor || '',
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
    const res = await $api(`/api/opportunities/${oppId}`, {
      method: 'PUT',
      body: editForm.value,
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '已保存', color: 'success' })
      showEditModal.value = false
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '保存出了点问题', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

async function advanceStage() {
  const currentIdx = stageFlow.indexOf(opp.value.status)
  if (currentIdx < 0 || currentIdx >= stageFlow.length - 1) return
  const nextStatus = stageFlow[currentIdx + 1]
  try {
    const res = await $api(`/api/opportunities/${oppId}`, {
      method: 'PUT',
      body: { status: nextStatus },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: `已推进到「${statusConfig[nextStatus as keyof typeof statusConfig]?.label}」`, color: 'success' })
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '推进失败', color: 'error' })
  }
}

async function handleFollowUp() {
  if (!followUpForm.value.content) {
    toast.add({ title: '跟进内容得填一下', color: 'warning' })
    return
  }
  followUpLoading.value = true
  try {
    const res = await $api(`/api/customers/${opp.value?.customer?.id}/follow-ups`, {
      method: 'POST',
      body: { ...followUpForm.value, opportunityId: oppId },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '跟进记录已添加', color: 'success' })
      showFollowUpModal.value = false
      followUpForm.value = { type: 'phone', content: '', nextFollowUpAt: '' }
      fetchDetail()
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '添加出了点问题', color: 'error' })
  } finally {
    followUpLoading.value = false
  }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    const res = await $api(`/api/opportunities/${oppId}`, { method: 'DELETE' }) as any
    if (res?.code === 0) {
      toast.add({ title: '已删除', color: 'success' })
      showDeleteModal.value = false
      router.push('/dashboard/opportunities')
    }
  } catch (err: any) {
    toast.add({ title: err?.data?.message || '删除失败', color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

function formatAmount(amount: number | null) {
  if (!amount && amount !== 0) return '-'
  return '¥' + Number(amount).toLocaleString()
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return date.slice(0, 10)
}

onMounted(() => {
  fetchDetail()
  fetchSourceOptions()
})
</script>

<template>
  <div>
    <div v-if="loading" class="py-4"><DetailSkeleton /></div>
    <div v-else-if="!opp" class="text-center py-12 text-content-muted">商机不存在</div>
    <template v-else>
      <!-- 头部 -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-2">
          <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.push('/dashboard/opportunities')" />
          <h1 class="text-lg font-medium text-content-primary">{{ opp.name }}</h1>
          <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', getStatusColor(opp.status)]">
            {{ getStatusLabel(opp.status) }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UButton v-if="canAdvance(opp.status)" size="xs" color="primary" icon="i-lucide-arrow-right" @click="advanceStage">
            推进到「{{ getNextStatusLabel(opp.status) }}」
          </UButton>
          <UButton v-if="opp.status === 'business_negotiation'" size="xs" icon="i-lucide-trophy" variant="ghost" color="success" @click="showWinModal = true">赢单</UButton>
          <UButton v-if="opp.status === 'business_negotiation'" size="xs" icon="i-lucide-x-circle" variant="ghost" color="error" @click="showLoseModal = true">输单</UButton>
          <div class="flex-1" />
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pen-line" @click="openEditModal">编辑</UButton>
          <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="showDeleteModal = true">删除</UButton>
        </div>
      </div>

      <!-- 阶段进度条 -->
      <OpportunityStageProgress :status="opp?.status" :is-closed="isClosed" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- 左侧：主内容 -->
        <div class="lg:col-span-2 space-y-4">
          <!-- 基本信息卡片 -->
          <div class="em-card">
            <h3 class="text-sm font-medium text-content-primary mb-3">基本信息</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span class="text-content-muted">预估金额</span>
                <p class="text-content-primary font-medium">{{ formatAmount(opp.estimatedAmount) }}</p>
              </div>
              <div>
                <span class="text-content-muted">预计成交日期</span>
                <p class="text-content-primary">{{ formatDate(opp.estimatedCloseDate) }}</p>
              </div>
              <div>
                <span class="text-content-muted">来源</span>
                <p class="text-content-primary">{{ opp.source || '-' }}</p>
              </div>
              <div>
                <span class="text-content-muted">竞争对手</span>
                <p class="text-content-primary">{{ opp.competitor || '-' }}</p>
              </div>
              <div v-if="opp.lostReason" class="col-span-2">
                <span class="text-content-muted">输单原因</span>
                <p class="text-danger-600">{{ opp.lostReason }}</p>
              </div>
            </div>
          </div>

          <!-- 关联产品 -->
          <OpportunityProductSection :products="opp?.products || []" :opp-id="oppId" @refresh="onRefresh" />

          <!-- 报价记录 -->
          <OpportunityQuoteSection :opp-id="oppId" :opp-name="opp?.name" @refresh="onRefresh" />

          <!-- 跟进记录 -->
          <div class="em-card">
            <FollowUpList :items="opp.followUps || []" :show-add-button="!isClosed" @add="showFollowUpModal = true" />
          </div>
        </div>

        <!-- 右侧：关联信息 -->
        <div class="space-y-4">
          <div class="em-card">
            <h3 class="text-sm font-medium text-content-primary mb-3">关联客户</h3>
            <div v-if="opp.customer">
              <NuxtLink :to="`/dashboard/customers/${opp.customer.id}`" class="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <UIcon name="i-lucide-building-2" class="w-4 h-4" />
                {{ opp.customer.name }}
              </NuxtLink>
            </div>
            <p v-else class="text-xs text-content-muted">未关联客户</p>
          </div>

          <div class="em-card">
            <h3 class="text-sm font-medium text-content-primary mb-3">负责人</h3>
            <div v-if="opp.owner" class="flex items-center gap-2 text-sm">
              <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-medium">
                {{ opp.owner.name?.charAt(0) }}
              </div>
              <span class="text-content-primary">{{ opp.owner.name }}</span>
            </div>
            <p v-else class="text-xs text-content-muted">未指定</p>
          </div>

          <div class="em-card">
            <h3 class="text-sm font-medium text-content-primary mb-3">时间线</h3>
            <div class="space-y-2 text-xs text-content-muted">
              <div class="flex justify-between">
                <span>创建时间</span>
                <span class="text-content-secondary">{{ opp.createdAt?.slice(0, 16)?.replace('T', ' ') }}</span>
              </div>
              <div class="flex justify-between">
                <span>更新时间</span>
                <span class="text-content-secondary">{{ opp.updatedAt?.slice(0, 16)?.replace('T', ' ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 编辑弹窗 -->
    <FormModal
      v-if="showEditModal"
      v-model:open="showEditModal"
      title="编辑商机"
      size="standard"
      :loading="editLoading"
      @confirm="handleEdit"
    >
      <template #default>
        <OpportunityForm v-model="editForm" :source-options="sourceOptions" preselected-customer @submit="handleEdit" />
      </template>
      <template #footer>
        <UButton color="primary" :loading="editLoading" @click="handleEdit">保存</UButton>
        <UButton variant="ghost" color="neutral" @click="showEditModal = false">算了</UButton>
      </template>
    </FormModal>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="showDeleteModal"
      v-model:open="showDeleteModal"
      title="确认删除"
      :message="`确定要删除商机「${opp?.name}」吗？删了就找不回来。`"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />

    <!-- 赢单/输单弹窗 -->
    <OpportunityWinLoseModal v-model="showWinModal" mode="win" :opportunity-id="oppId" :opportunity-name="opp?.name" @saved="onRefresh" />
    <OpportunityWinLoseModal v-model="showLoseModal" mode="lose" :opportunity-id="oppId" :opportunity-name="opp?.name" @saved="onRefresh" />

    <!-- 跟进记录弹窗 -->
    <FormModal
      v-if="showFollowUpModal"
      v-model:open="showFollowUpModal"
      title="添加跟进"
      size="standard"
      :loading="followUpLoading"
      @confirm="handleFollowUp"
    >
      <template #default>
        <FollowUpForm v-model="followUpForm" :loading="followUpLoading" @submit="handleFollowUp" />
      </template>
      <template #footer>
        <UButton color="primary" :loading="followUpLoading" @click="handleFollowUp">添加</UButton>
        <UButton variant="ghost" color="neutral" @click="showFollowUpModal = false">算了</UButton>
      </template>
    </FormModal>
  </div>
</template>
