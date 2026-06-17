<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '对账单详情', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const route = useRoute()

const item = ref<any>(null)
const loading = ref(true)
const actionLoading = ref(false)
const showConfirm = ref(false)
const showDispute = ref(false)

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

const statusLabels: Record<string, string> = { pending: '待确认', confirmed: '已确认', disputed: '有争议' }

async function fetchDetail() {
  loading.value = true
  try {
    const res = await $api(`/api/reconciliations/${route.params.id}`) as any
    if (res?.code === 0) item.value = res.data
  } catch { }
  finally { loading.value = false }
}

async function handleConfirm() {
  actionLoading.value = true
  try {
    const res = await $api(`/api/reconciliations/${item.value.id}/confirm`, { method: 'POST' }) as any
    if (res?.code === 0) { toast.add({ title: '对账已确认', color: 'success' }); showConfirm.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '确认失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

async function handleDispute() {
  actionLoading.value = true
  try {
    const res = await $api(`/api/reconciliations/${item.value.id}/dispute`, { method: 'POST', body: { remark: '' } }) as any
    if (res?.code === 0) { toast.add({ title: '已标记争议', color: 'success' }); showDispute.value = false; fetchDetail() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '操作失败', color: 'error' }) }
  finally { actionLoading.value = false }
}

onMounted(() => { fetchDetail() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <NuxtLink to="/dashboard/finance/reconciliations" class="text-xs text-content-muted hover:text-brand-600 mb-1 inline-block">← 返回列表</NuxtLink>
        <h1 class="text-lg font-medium text-content-primary">对账单详情</h1>
      </div>
      <div v-if="item && item.status === 'pending'" class="flex items-center gap-2">
        <UButton icon="i-lucide-check-circle" color="primary" size="sm" @click="showConfirm = true">确认对账</UButton>
        <UButton icon="i-lucide-alert-triangle" variant="ghost" color="neutral" size="sm" @click="showDispute = true">标记争议</UButton>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="item">
      <!-- 对账单头 -->
      <div class="em-card p-6 mb-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div><span class="text-xs text-content-muted">对账单号</span><p class="text-sm font-medium text-content-primary">{{ item.code }}</p></div>
          <div><span class="text-xs text-content-muted">客户</span><p class="text-sm font-medium text-content-primary">{{ item.customerName }}</p></div>
          <div><span class="text-xs text-content-muted">期间</span><p class="text-sm text-content-primary">{{ item.periodStart?.slice(0, 10) }} ~ {{ item.periodEnd?.slice(0, 10) }}</p></div>
          <div><span class="text-xs text-content-muted">状态</span><p class="text-sm font-medium" :class="item.status === 'confirmed' ? 'text-teal-600' : item.status === 'disputed' ? 'text-amber-600' : 'text-brand-600'">{{ statusLabels[item.status] }}</p></div>
        </div>

        <!-- 金额汇总 -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-surface-page rounded-lg">
          <div class="text-center"><p class="text-xs text-content-muted">期初应收</p><p class="text-lg font-medium text-content-primary">{{ formatMoney(item.openingAmount) }}</p></div>
          <div class="text-center"><p class="text-xs text-content-muted">本期新增合同</p><p class="text-lg font-medium text-brand-600">{{ formatMoney(item.contractAmount) }}</p></div>
          <div class="text-center"><p class="text-xs text-content-muted">本期回款</p><p class="text-lg font-medium text-teal-600">{{ formatMoney(item.receivedAmount) }}</p></div>
          <div class="text-center"><p class="text-xs text-content-muted">期末应收</p><p class="text-lg font-medium" :class="item.closingAmount > 0 ? 'text-red-500' : 'text-teal-600'">{{ formatMoney(item.closingAmount) }}</p></div>
        </div>
      </div>

      <!-- 对账明细 -->
      <div class="em-card">
        <div class="p-4 border-b border-line-light">
          <h2 class="text-sm font-medium text-content-primary">对账明细</h2>
        </div>
        <div v-if="item.items?.length === 0" class="p-6 text-center text-sm text-content-muted">期间内无回款记录</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-line-light text-content-muted">
              <th class="text-left py-3 px-4 font-normal">回款日期</th>
              <th class="text-right py-3 px-4 font-normal">回款金额</th>
              <th class="text-right py-3 px-4 font-normal">核定金额</th>
              <th class="text-left py-3 px-4 font-normal">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ri in item.items" :key="ri.id" class="border-b border-line-light">
              <td class="py-3 px-4 text-content-secondary">{{ ri.paymentDate?.slice(0, 10) || '-' }}</td>
              <td class="text-right py-3 px-4 text-content-secondary">{{ formatMoney(ri.paymentAmount) }}</td>
              <td class="text-right py-3 px-4 text-content-secondary">{{ formatMoney(ri.matchedAmount) }}</td>
              <td class="py-3 px-4 text-content-secondary">{{ ri.remark || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog v-if="showConfirm" v-model:open="showConfirm" title="确认对账"
      message="确认对账无误？确认后关联回款将被锁定，不可修改。"
      confirm-text="确认" cancel-text="再想想" :loading="actionLoading" @confirm="handleConfirm" @cancel="showConfirm = false" />
    <ConfirmDialog v-if="showDispute" v-model:open="showDispute" title="标记争议"
      message="确定标记为有争议吗？"
      confirm-text="标记争议" cancel-text="再想想" :loading="actionLoading" @confirm="handleDispute" @cancel="showDispute = false" />
  </div>
</template>
