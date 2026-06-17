<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '订金管理', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()

const {
  loading, list: items, total, page,
  totalPages, keyword, onSearchInput, fetchList,
} = useTable<any>({ apiUrl: '/api/deposits' })

const showCreate = ref(false)
const showRefund = ref(false)
const showWriteOff = ref(false)
const refundTarget = ref<any>(null)
const writeOffTarget = ref<any>(null)
const saving = ref(false)

const newForm = ref({ customerId: '', contractId: '', amount: 0, paymentDate: '', paymentMethod: 'bank_transfer', remark: '' })
const refundForm = ref({ amount: 0, reason: '', refundDate: '' })
const writeOffForm = ref({ depositPaymentId: '', contractId: '', amount: 0, remark: '' })

function formatMoney(v: any) {
  const n = Number(v)
  if (!n || isNaN(n)) return '-'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

async function handleCreate() {
  if (!newForm.value.customerId) { toast.add({ title: '请选择客户', color: 'warning' }); return }
  if (!newForm.value.amount || newForm.value.amount <= 0) { toast.add({ title: '金额还没填呢', color: 'warning' }); return }
  if (!newForm.value.paymentDate) { toast.add({ title: '请选择收款日期', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/deposits', { method: 'POST', body: newForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '订金已登记', color: 'success' }); showCreate.value = false; newForm.value.amount = 0; newForm.value.remark = ''; fetchList() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '登记失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleRefund() {
  if (!refundForm.value.amount || refundForm.value.amount <= 0) { toast.add({ title: '退款金额还没填呢', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api(`/api/deposits/${refundTarget.value.id}/refund`, { method: 'POST', body: refundForm.value }) as any
    if (res?.code === 0) { toast.add({ title: '退款已处理', color: 'success' }); showRefund.value = false; fetchList() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '退款失败', color: 'error' }) }
  finally { saving.value = false }
}

async function handleWriteOff() {
  if (!writeOffForm.value.contractId) { toast.add({ title: '请选择目标合同', color: 'warning' }); return }
  if (!writeOffForm.value.amount || writeOffForm.value.amount <= 0) { toast.add({ title: '核销金额还没填呢', color: 'warning' }); return }
  saving.value = true
  try {
    const res = await $api('/api/deposits/writeoffs', { method: 'POST', body: {
      depositPaymentId: writeOffTarget.value.id,
      contractId: writeOffForm.value.contractId,
      amount: writeOffForm.value.amount,
      remark: writeOffForm.value.remark,
    } }) as any
    if (res?.code === 0) { toast.add({ title: '核销申请已提交', color: 'success' }); showWriteOff.value = false; fetchList() }
  } catch (err: any) { toast.add({ title: err?.data?.message || '核销失败', color: 'error' }) }
  finally { saving.value = false }
}

const paymentMethodLabels: Record<string, string> = { bank_transfer: '银行转账', check: '支票', cash: '现金', alipay: '支付宝', wechat_pay: '微信支付', other: '其他' }

function openRefund(item: any) { refundTarget.value = item; refundForm.value = { amount: item.remainingAmount, reason: '', refundDate: new Date().toISOString().slice(0, 10) }; showRefund.value = true }
function openWriteOff(item: any) { writeOffTarget.value = item; writeOffForm.value = { depositPaymentId: item.id, contractId: '', amount: item.remainingAmount, remark: '' }; showWriteOff.value = true }

onMounted(() => { fetchList() })
</script>

<template>
  <div>
    <PageHeader title="订金管理" description="登记订金、退款、转正式回款">
      <template #actions>
        <UButton icon="i-lucide-plus" color="primary" size="sm" @click="showCreate = true">登记订金</UButton>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="relative max-w-xs">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
        <input v-model="keyword" type="text" placeholder="搜客户名..." class="w-full pl-9 input-base focus-ring" @input="onSearchInput" />
      </div>
      <span class="text-xs text-content-muted">共 {{ total }} 条</span>
    </div>

    <div v-if="loading" class="text-center py-12 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">
      <UIcon name="i-lucide-hand-coins" class="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p class="text-sm">还没有订金记录</p>
    </div>
    <div v-else class="space-y-2">
      <div v-for="item in items" :key="item.id" class="em-card flex items-center gap-4 group">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-content-primary">{{ item.customerName || '-' }}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-600">订金</span>
            <span v-if="item.refundedAt" class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-500">已退款</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-content-muted">
            <span class="text-teal-600 font-medium">{{ formatMoney(item.amount) }}</span>
            <span v-if="item.remainingAmount != null && item.remainingAmount > 0">剩余 {{ formatMoney(item.remainingAmount) }}</span>
            <span>{{ item.paymentDate?.slice(0, 10) }}</span>
            <span>{{ paymentMethodLabels[item.paymentMethod] || item.paymentMethod }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton v-if="!item.refundedAt && item.remainingAmount > 0" icon="i-lucide-refresh-cw" variant="ghost" color="neutral" size="xs" title="转回款" @click="openWriteOff(item)" />
          <UButton v-if="!item.refundedAt && item.remainingAmount > 0" icon="i-lucide-undo-2" variant="ghost" color="neutral" size="xs" title="退款" @click="openRefund(item)" />
        </div>
      </div>
    </div>

    <Pagination v-model:page="page" :total-pages="totalPages" @prev="fetchList" @next="fetchList" />

    <!-- 登记订金 -->
    <FormModal v-if="showCreate" v-model:open="showCreate" title="登记订金" size="standard" :loading="saving" @confirm="handleCreate" @cancel="showCreate = false">
      <form class="space-y-3" @submit.prevent="handleCreate">
        <div><label class="block text-sm text-content-secondary mb-1">客户 <span class="text-red-400">*</span></label><CustomerSelect v-model="newForm.customerId" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">关联合同（可选）</label><input v-model="newForm.contractId" type="text" placeholder="合同 ID，签合同前可不填" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">订金金额 <span class="text-red-400">*</span></label><input v-model.number="newForm.amount" type="number" min="0" step="0.01" placeholder="0.00" class="w-full input-base focus-ring" /></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm text-content-secondary mb-1">收款日期 <span class="text-red-400">*</span></label><input v-model="newForm.paymentDate" type="date" class="w-full input-base focus-ring" /></div>
          <div><label class="block text-sm text-content-secondary mb-1">收款方式</label><select v-model="newForm.paymentMethod" class="w-full input-base focus-ring"><option value="bank_transfer">银行转账</option><option value="alipay">支付宝</option><option value="wechat_pay">微信支付</option><option value="cash">现金</option><option value="check">支票</option><option value="other">其他</option></select></div>
        </div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="newForm.remark" type="text" class="w-full input-base focus-ring" /></div>
      </form>
    </FormModal>

    <!-- 退款 -->
    <FormModal v-if="showRefund" v-model:open="showRefund" title="订金退款" size="standard" :loading="saving" @confirm="handleRefund" @cancel="showRefund = false">
      <form class="space-y-3" @submit.prevent="handleRefund">
        <div><label class="block text-sm text-content-secondary mb-1">退款金额 <span class="text-red-400">*</span></label><input v-model.number="refundForm.amount" type="number" min="0" step="0.01" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">退款原因</label><input v-model="refundForm.reason" type="text" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">退款日期</label><input v-model="refundForm.refundDate" type="date" class="w-full input-base focus-ring" /></div>
      </form>
    </FormModal>

    <!-- 转回款 -->
    <FormModal v-if="showWriteOff" v-model:open="showWriteOff" title="订金转回款" size="standard" :loading="saving" @confirm="handleWriteOff" @cancel="showWriteOff = false">
      <form class="space-y-3" @submit.prevent="handleWriteOff">
        <div><label class="block text-sm text-content-secondary mb-1">目标合同 <span class="text-red-400">*</span></label><input v-model="writeOffForm.contractId" type="text" placeholder="合同 ID" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">核销金额 <span class="text-red-400">*</span></label><input v-model.number="writeOffForm.amount" type="number" min="0" step="0.01" class="w-full input-base focus-ring" /></div>
        <div><label class="block text-sm text-content-secondary mb-1">备注</label><input v-model="writeOffForm.remark" type="text" class="w-full input-base focus-ring" /></div>
      </form>
    </FormModal>
  </div>
</template>
