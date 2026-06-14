<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '提成详情', middleware: ['auth'], watermark: true })

const route = useRoute()
const toast = useToast()
const { $api } = useNuxtApp()

const item = ref<any>(null)
const loading = ref(true)

// 审批
const approveLoading = ref(false)
const showRejectModal = ref(false)
const rejectReason = ref('')
const rejectLoading = ref(false)

// 调整
const showAdjustModal = ref(false)
const adjustLoading = ref(false)
const adjustForm = ref({ adjustAmount: 0, adjustReason: '' })

// 删除
const showDeleteModal = ref(false)
const deleteLoading = ref(false)

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-surface-hover text-content-secondary' },
  approved: { label: '已通过', color: 'bg-brand-50 text-brand-600' },
  rejected: { label: '已驳回', color: 'bg-red-50 text-red-600' },
  paid: { label: '已发放', color: 'bg-teal-50 text-teal-700' },
}

function formatMoney(v: any) {
  const n = Number(v)
  if (!n) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/commissions/${route.params.id}`) as any
    if (res?.code === 0) item.value = res.data
  } catch (err: any) { toast.add({ title: '加载出错，请重试', color: 'error' }) }
  finally { loading.value = false }
}

async function handleApprove() {
  approveLoading.value = true
  try {
    await $api(`/api/commissions/${route.params.id}/approve`, { method: 'POST' })
    toast.add({ title: '审批通过了！', color: 'success' })
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '审批失败', color: 'error' }) }
  finally { approveLoading.value = false }
}

async function handleReject() {
  if (!rejectReason.value) { toast.add({ title: '驳回原因还没填', color: 'warning' }); return }
  rejectLoading.value = true
  try {
    await $api(`/api/commissions/${route.params.id}/reject`, { method: 'POST', body: { reason: rejectReason.value } })
    toast.add({ title: '已驳回', color: 'success' })
    showRejectModal.value = false
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '驳回失败', color: 'error' }) }
  finally { rejectLoading.value = false }
}

function openAdjust() {
  adjustForm.value = { adjustAmount: item.value.adjustAmount || item.value.amount, adjustReason: item.value.adjustReason || '' }
  showAdjustModal.value = true
}

async function handleAdjust() {
  adjustLoading.value = true
  try {
    await $api(`/api/commissions/${route.params.id}/adjust`, { method: 'PUT', body: adjustForm.value })
    toast.add({ title: '提成已调整', color: 'success' })
    showAdjustModal.value = false
    fetchDetail()
  } catch (err: any) { toast.add({ title: err?.data?.message || '调整失败', color: 'error' }) }
  finally { adjustLoading.value = false }
}

async function handleDelete() {
  deleteLoading.value = true
  try {
    await $api(`/api/commissions/${route.params.id}`, { method: 'DELETE' })
    toast.add({ title: '已删除', color: 'success' })
    navigateTo('/dashboard/commissions')
  } catch (err: any) { toast.add({ title: err?.data?.message || '删除失败', color: 'error' }) }
  finally { deleteLoading.value = false }
}

onMounted(() => fetchDetail())
</script>

<template>
  <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
  <div v-else-if="!item" class="text-center py-12 text-content-muted">找不到这条提成记录</div>
  <div v-else>
    <!-- 头部 -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/dashboard/commissions" class="text-content-muted hover:text-content-secondary">
          <UIcon name="i-lucide-arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-medium text-content-primary">{{ item.user?.name }} - {{ item.contract?.name }}</h1>
          <p class="text-sm text-content-muted mt-0.5">{{ item.periodMonth }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="item.status === 'pending'">
          <UButton icon="i-lucide-check" color="primary" :loading="approveLoading" @click="handleApprove">通过</UButton>
          <UButton icon="i-lucide-x" color="warning" variant="outline" @click="showRejectModal = true; rejectReason = ''">驳回</UButton>
          <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" @click="openAdjust">调整</UButton>
        </template>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" @click="showDeleteModal = true">删除</UButton>
      </div>
    </div>

    <!-- 详情内容 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 主内容 -->
      <div class="lg:col-span-2 space-y-4">
        <!-- 提成信息卡片 -->
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-4">提成信息</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-content-muted mb-0.5">状态</p>
              <span :class="['text-xs px-2 py-0.5 rounded-full', statusConfig[item.status]?.color || '']">
                {{ statusConfig[item.status]?.label || item.status }}
              </span>
            </div>
            <div>
              <p class="text-xs text-content-muted mb-0.5">结算月份</p>
              <p class="text-sm text-content-secondary">{{ item.periodMonth }}</p>
            </div>
            <div>
              <p class="text-xs text-content-muted mb-0.5">提成基数</p>
              <p class="text-sm font-medium text-content-secondary">{{ formatMoney(item.baseAmount) }}</p>
            </div>
            <div>
              <p class="text-xs text-content-muted mb-0.5">提成比例</p>
              <p class="text-sm font-medium text-content-secondary">{{ (Number(item.rate) * 100).toFixed(1) }}%</p>
            </div>
            <div>
              <p class="text-xs text-content-muted mb-0.5">原始金额</p>
              <p class="text-sm font-medium text-content-secondary">{{ formatMoney(item.amount) }}</p>
            </div>
            <div>
              <p class="text-xs text-content-muted mb-0.5">实际金额</p>
              <p class="text-sm font-medium text-teal-600">{{ formatMoney(item.adjustAmount || item.amount) }}</p>
            </div>
            <div v-if="item.adjustReason">
              <p class="text-xs text-content-muted mb-0.5">调整原因</p>
              <p class="text-sm text-brand-600">{{ item.adjustReason }}</p>
            </div>
            <div>
              <p class="text-xs text-content-muted mb-0.5">匹配规则</p>
              <p class="text-sm text-content-secondary">{{ item.rule?.name || '-' }}</p>
            </div>
          </div>
        </div>

        <!-- 合同信息 -->
        <div class="em-card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-content-secondary">关联合同</h3>
            <NuxtLink v-if="item.contractId" :to="`/dashboard/contracts/${item.contractId}`" class="text-xs text-brand-600 hover:underline">查看合同 →</NuxtLink>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-md bg-brand-50 flex items-center justify-center">
              <UIcon name="i-lucide-file-text" class="w-5 h-5 text-brand-500" />
            </div>
            <div>
              <p class="text-sm font-medium text-content-secondary">{{ item.contract?.name }}</p>
              <p class="text-xs text-content-muted">{{ item.contract?.code }}</p>
            </div>
          </div>
        </div>

        <!-- 审批信息 -->
        <div v-if="item.approvedBy" class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-3">审批信息</h3>
          <div class="flex items-center gap-2 text-sm text-content-secondary">
            <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-teal-500" />
            <span>{{ item.approvedBy?.name }} 于 {{ item.approvedAt?.slice(0, 10) }} 审批</span>
          </div>
        </div>

        <!-- 发放记录 -->
        <div v-if="item.payoutItems?.length" class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-3">发放记录</h3>
          <div class="space-y-1.5">
            <div v-for="p in item.payoutItems" :key="p.payoutId" class="flex items-center justify-between p-2 rounded-md bg-teal-50 text-xs">
              <span class="text-content-secondary">发放单：{{ p.payoutId?.slice(0, 8) }}</span>
              <span class="text-teal-600 font-medium">{{ formatMoney(p.amount) }}</span>
            </div>
          </div>
        </div>

        <!-- 备注 -->
        <div v-if="item.remark" class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-2">备注</h3>
          <p class="text-sm text-content-secondary">{{ item.remark }}</p>
        </div>
      </div>

      <!-- 侧边栏 -->
      <div class="space-y-4">
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-3">人员信息</h3>
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <span class="text-brand-700 text-sm font-medium">{{ item.user?.name?.charAt(0) }}</span>
            </div>
            <div>
              <p class="text-sm font-medium text-content-secondary">{{ item.user?.name }}</p>
            </div>
          </div>
        </div>

        <div class="em-card">
          <h3 class="text-sm font-medium text-content-secondary mb-3">时间</h3>
          <div class="space-y-2 text-xs text-content-muted">
            <div class="flex justify-between"><span>创建时间</span><span>{{ item.createdAt?.slice(0, 10) }}</span></div>
            <div v-if="item.approvedAt" class="flex justify-between"><span>审批时间</span><span>{{ item.approvedAt?.slice(0, 10) }}</span></div>
          </div>
        </div>
      </div>
    </div>

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
      <div>
        <label class="block text-sm text-content-secondary mb-1">驳回原因</label>
        <textarea v-model="rejectReason" rows="2" placeholder="写明原因..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="warning" :loading="rejectLoading" @click="handleReject">确认驳回</UButton>
          <UButton variant="ghost" color="neutral" @click="showRejectModal = false">算了</UButton>
        </div>
      </template>
    </FormModal>

    <!-- 调整弹窗 -->
    <FormModal
      v-if="showAdjustModal"
      v-model:open="showAdjustModal"
      title="调整提成"
      size="compact"
      :loading="adjustLoading"
      @confirm="handleAdjust"
      @cancel="showAdjustModal = false"
    >
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
      message="确定要删除这条提成记录吗？删了就找不回来了。"
      confirm-text="确认删除"
      cancel-text="再想想"
      :loading="deleteLoading"
      danger
      @confirm="handleDelete"
    />
  </div>
</template>
