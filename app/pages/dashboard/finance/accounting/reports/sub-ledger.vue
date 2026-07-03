<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '明细账', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const data = ref<any>(null)
const loading = ref(false)
const accounts = ref<any[]>([])
const selectedAccountId = ref('')
const startDate = ref('')
const endDate = ref('')

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchAccounts() {
  try { const res = await $api('/api/accounting/accounts') as any; if (res?.code === 0) accounts.value = res.data.flat || [] } catch {}
}

async function fetchData() {
  if (!selectedAccountId.value) return
  loading.value = true
  try {
    const params: Record<string, any> = { accountId: selectedAccountId.value }
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await $api('/api/accounting/reports/sub-ledger', { params }) as any
    if (res?.code === 0) data.value = res.data
  } catch {}
  finally { loading.value = false }
}

watch(selectedAccountId, () => fetchData())

onMounted(() => fetchAccounts())
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">明细账</h1>
        <p class="text-sm text-content-muted mt-0.5">按科目查看所有会计分录</p>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-4">
      <select v-model="selectedAccountId" class="input-base text-sm h-9 min-w-[200px]">
        <option value="" disabled>选择科目</option>
        <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.code }} {{ acc.name }}</option>
      </select>
      <input v-model="startDate" type="date" class="input-base text-sm h-9" @change="fetchData" />
      <span class="text-content-muted text-xs">~</span>
      <input v-model="endDate" type="date" class="input-base text-sm h-9" @change="fetchData" />
    </div>

    <div v-if="!selectedAccountId" class="text-center py-12 text-content-muted">请先选择科目</div>
    <div v-else-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="data">
      <div v-if="data.account" class="mb-4 flex items-center gap-2">
        <span class="text-sm font-medium">{{ data.account.code }} {{ data.account.name }}</span>
        <span class="text-xs text-content-muted">| 方向: {{ data.account.balanceDirection === 'debit' ? '借方' : '贷方' }}</span>
      </div>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="em-card text-center"><p class="text-xs text-content-muted mb-1">本期借方</p><p class="text-lg font-medium text-teal-600">{{ formatMoney(data.periodSummary?.totalDebit) }}</p></div>
        <div class="em-card text-center"><p class="text-xs text-content-muted mb-1">本期贷方</p><p class="text-lg font-medium text-danger-500">{{ formatMoney(data.periodSummary?.totalCredit) }}</p></div>
        <div class="em-card text-center"><p class="text-xs text-content-muted mb-1">期末余额</p><p class="text-lg font-medium">{{ formatMoney(data.periodSummary?.closingBalance) }} ({{ data.periodSummary?.closingDirection }})</p></div>
      </div>

      <div class="em-card overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2 px-3">日期</th><th class="py-2 px-3">凭证号</th><th class="py-2 px-3">摘要</th><th class="py-2 px-3 text-right">借方</th><th class="py-2 px-3 text-right">贷方</th></tr></thead>
          <tbody>
            <tr v-for="(e, i) in (data.entries || [])" :key="i" class="border-b border-line-light/30">
              <td class="py-1.5 px-3 text-xs text-content-muted">{{ e.voucherDate }}</td>
              <td class="py-1.5 px-3 text-xs font-mono text-content-secondary">{{ e.voucherNo }}</td>
              <td class="py-1.5 px-3 text-xs text-content-primary">{{ e.summary || e.voucherSummary }}</td>
              <td class="py-1.5 px-3 text-xs text-right text-teal-600">{{ e.debitAmount > 0 ? formatMoney(e.debitAmount) : '' }}</td>
              <td class="py-1.5 px-3 text-xs text-right text-danger-500">{{ e.creditAmount > 0 ? formatMoney(e.creditAmount) : '' }}</td>
            </tr>
            <tr v-if="(data.entries || []).length === 0"><td colspan="5" class="text-center py-8 text-content-muted">该科目在本期内没有分录</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
