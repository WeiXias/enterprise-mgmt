<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '提成发放', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const payouts = ref<any[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// 待发放的已通过提成
const approvedItems = ref<any[]>([])

// 创建发放单
const showCreateModal = ref(false)
const createLoading = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const periodMonth = ref('')

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-surface-hover text-content-secondary' },
  confirmed: { label: '已发放', color: 'bg-teal-50 text-teal-700' },
  paid: { label: '已发放', color: 'bg-teal-50 text-teal-700' },
}

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchPayouts() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, pageSize: pageSize.value }
    const res = await $api('/api/commission-payouts', { params }) as any
    if (res?.code === 0) { payouts.value = res.data.items; total.value = res.data.total }
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchApproved() {
  try {
    const res = await $api('/api/commissions', { params: { status: 'approved', pageSize: 200 } }) as any
    if (res?.code === 0) approvedItems.value = res.data.items
  } catch { /* ignore */ }
}

function toggleSelect(id: string) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedIds.value = s
}

function selectAll() {
  if (selectedIds.value.size === approvedItems.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(approvedItems.value.map((i: any) => i.id))
  }
}

async function handleCreatePayout() {
  if (selectedIds.value.size === 0) { toast.add({ title: '至少选一条提成', color: 'warning' }); return }
  if (!periodMonth.value) { toast.add({ title: '填一下发放月份', color: 'warning' }); return }
  createLoading.value = true
  try {
    const res = await $api('/api/commission-payouts', {
      method: 'POST',
      body: { commissionIds: [...selectedIds.value], periodMonth: periodMonth.value },
    }) as any
    if (res?.code === 0) {
      toast.add({ title: '发放单已创建', color: 'success' })
      showCreateModal.value = false
      selectedIds.value = new Set()
      periodMonth.value = ''
      fetchPayouts()
      fetchApproved()
    }
  } catch (err: any) { toast.add({ title: err?.data?.message || '创建失败', color: 'error' }) }
  finally { createLoading.value = false }
}

async function handleConfirm(id: string) {
  try {
    const res = await $api(`/api/commission-payouts/${id}/confirm`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: '提成已确认发放', color: 'success' }); fetchPayouts() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '确认失败', color: 'error' }) }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

// 计算选中总额
const selectedTotal = computed(() => {
  let sum = 0
  for (const item of approvedItems.value) {
    if (selectedIds.value.has(item.id)) sum += Number(item.adjustAmount) || Number(item.amount)
  }
  return sum
})

onMounted(() => { fetchPayouts(); fetchApproved() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">提成发放</h1>
        <p class="text-sm text-content-muted mt-0.5">创建和管理提成发放单</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/dashboard/commissions"><UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">返回提成</UButton></NuxtLink>
        <UButton icon="i-lucide-plus" color="primary" @click="showCreateModal = true; fetchApproved()">创建发放单</UButton>
      </div>
    </div>

    <!-- 发放单列表 -->
    <div v-if="loading" class="text-center py-12 text-content-muted">马上就好...</div>
    <div v-else-if="payouts.length === 0" class="text-center py-12 text-content-muted">还没有发放单，先创建一张？</div>
    <div v-else class="space-y-2">
      <div v-for="p in payouts" :key="p.id" class="em-card flex items-center gap-4">
        <div :class="['w-1 h-10 rounded-full flex-shrink-0', p.status === 'confirmed' ? 'bg-teal-400' : 'bg-surface-hover']" />
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-content-secondary">{{ p.periodMonth }} 发放单</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusConfig[p.status]?.color || '']">{{ statusConfig[p.status]?.label || p.status }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-content-muted">
            <span class="font-medium text-content-secondary">{{ formatMoney(p.totalAmount) }}</span>
            <span v-if="p.creatorName">创建人：{{ p.creatorName }}</span>
            <span v-if="p.paidAt">发放时间：{{ p.paidAt }}</span>
          </div>
        </div>
        <UButton
          v-if="p.status === 'draft'"
          icon="i-lucide-check-circle"
          color="primary"
          variant="ghost"
          size="xs"
          @click="handleConfirm(p.id)"
        >确认发放</UButton>
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-content-muted">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchPayouts()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchPayouts()">下一页</UButton>
      </div>
    </div>

    <!-- 创建发放单弹窗 -->
    <FormModal
      v-if="showCreateModal"
      v-model:open="showCreateModal"
      title="创建发放单"
      size="standard"
      :loading="createLoading"
      @confirm="handleCreatePayout"
      @cancel="showCreateModal = false"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-content-secondary mb-1">发放月份 <span class="text-danger-500">*</span></label>
          <input v-model="periodMonth" type="month" class="w-full input-base focus-ring" />
        </div>

        <div v-if="approvedItems.length === 0" class="text-xs text-content-muted bg-surface-hover p-3 rounded-md">暂无可发放提成（需要审批通过后才会出现在这里）</div>
        <div v-else>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm text-content-secondary">选择提成记录</label>
            <button class="text-xs text-brand-600 hover:underline" @click="selectAll">{{ selectedIds.size === approvedItems.length ? '取消全选' : '全选' }}</button>
          </div>
          <div class="max-h-64 overflow-y-auto space-y-1">
            <label v-for="item in approvedItems" :key="item.id" class="flex items-center gap-2 p-2 rounded-md hover:bg-surface-hover cursor-pointer text-xs">
              <input type="checkbox" :checked="selectedIds.has(item.id)" class="rounded border-line text-brand-500 focus:ring-brand-400" @change="toggleSelect(item.id)" />
              <span class="text-content-secondary">{{ item.user?.name }}</span>
              <span class="text-content-muted">-</span>
              <span class="text-content-secondary">{{ formatMoney(Number(item.adjustAmount) || Number(item.amount)) }}</span>
            </label>
          </div>
          <div class="mt-2 pt-2 border-t border-line-light text-sm text-content-secondary">
            已选 {{ selectedIds.size }} 条，合计 {{ formatMoney(selectedTotal) }}
          </div>
        </div>
      </div>
    </FormModal>
  </div>
</template>
