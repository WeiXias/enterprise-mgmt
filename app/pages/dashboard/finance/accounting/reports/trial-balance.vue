<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '试算平衡表', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const items = ref<any[]>([])
const summary = ref({ totalDebit: 0, totalCredit: 0, isBalanced: true })
const loading = ref(true)
const periods = ref<any[]>([])
const periodId = ref('')

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchBalances() {
  if (!periodId.value) return
  loading.value = true
  try {
    const res = await $api('/api/accounting/balances', { params: { periodId: periodId.value } }) as any
    if (res?.code === 0) { items.value = res.data.items || []; summary.value = res.data.summary }
  } catch {}
  finally { loading.value = false }
}

async function fetchPeriods() {
  try { const res = await $api('/api/accounting/periods') as any; if (res?.code === 0) { periods.value = res.data || []; const now = new Date(); const key = `${now.getFullYear()}-${now.getMonth() + 1}`; const current = periods.value.find((p: any) => `${p.year}-${p.month}` === key); if (current) periodId.value = current.id } } catch {}
}

watch(periodId, () => fetchBalances())
onMounted(() => fetchPeriods())
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">试算平衡表</h1>
        <p class="text-sm text-content-muted mt-0.5">检查借贷是否平衡</p>
      </div>
      <select v-model="periodId" class="input-base text-sm h-9">
        <option value="" disabled>选择期间</option>
        <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.year }}年{{ p.month }}月 {{ p.isClosed ? '(已结账)' : '' }}</option>
      </select>
    </div>

    <div v-if="!periodId" class="text-center py-12 text-content-muted">请先选择会计期间</div>
    <div v-else-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else>
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="em-card text-center"><p class="text-xs text-content-muted mb-1">借方合计</p><p class="text-lg font-medium text-teal-600">{{ formatMoney(summary.totalDebit) }}</p></div>
        <div class="em-card text-center"><p class="text-xs text-content-muted mb-1">贷方合计</p><p class="text-lg font-medium text-danger-500">{{ formatMoney(summary.totalCredit) }}</p></div>
        <div class="em-card text-center"><p class="text-xs text-content-muted mb-1">是否平衡</p><p :class="['text-lg font-medium', summary.isBalanced ? 'text-teal-600' : 'text-danger-500']">{{ summary.isBalanced ? '平衡 ✓' : '不平衡 ✗' }}</p></div>
      </div>

      <div class="em-card overflow-hidden">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-line-light text-left text-xs text-content-muted"><th class="py-2 px-3">科目编码</th><th class="py-2 px-3">科目名称</th><th class="py-2 px-3 text-right">期初借方</th><th class="py-2 px-3 text-right">期初贷方</th><th class="py-2 px-3 text-right">本期借方</th><th class="py-2 px-3 text-right">本期贷方</th><th class="py-2 px-3 text-right">期末借方</th><th class="py-2 px-3 text-right">期末贷方</th></tr></thead>
          <tbody>
            <tr v-if="items.length === 0"><td colspan="8" class="text-center py-8 text-content-muted">该期间还没有过账凭证</td></tr>
            <tr v-for="r in items" :key="r.accountId" class="border-b border-line-light/50">
              <td class="py-1.5 px-3 text-xs text-content-secondary font-mono">{{ r.accountCode }}</td>
              <td class="py-1.5 px-3 text-xs text-content-primary">{{ r.accountName }}</td>
              <td class="py-1.5 px-3 text-xs text-right">{{ Number(r.openingDebit) > 0 ? formatMoney(r.openingDebit) : '' }}</td>
              <td class="py-1.5 px-3 text-xs text-right">{{ Number(r.openingCredit) > 0 ? formatMoney(r.openingCredit) : '' }}</td>
              <td class="py-1.5 px-3 text-xs text-right font-medium">{{ Number(r.periodDebit) > 0 ? formatMoney(r.periodDebit) : '' }}</td>
              <td class="py-1.5 px-3 text-xs text-right font-medium">{{ Number(r.periodCredit) > 0 ? formatMoney(r.periodCredit) : '' }}</td>
              <td class="py-1.5 px-3 text-xs text-right">{{ Number(r.closingDebit) > 0 ? formatMoney(r.closingDebit) : '' }}</td>
              <td class="py-1.5 px-3 text-xs text-right">{{ Number(r.closingCredit) > 0 ? formatMoney(r.closingCredit) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
