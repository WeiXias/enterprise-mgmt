<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '总分类账', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const items = ref<any[]>([])
const loading = ref(false)
const periods = ref<any[]>([])
const periodId = ref('')

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchData() {
  if (!periodId.value) return
  loading.value = true
  try {
    const res = await $api('/api/accounting/reports/ledger', { params: { periodId: periodId.value } }) as any
    if (res?.code === 0) items.value = res.data.items || []
  } catch {}
  finally { loading.value = false }
}

async function fetchPeriods() {
  try { const res = await $api('/api/accounting/periods') as any; if (res?.code === 0) { periods.value = res.data || []; const now = new Date(); const key = `${now.getFullYear()}-${now.getMonth() + 1}`; const current = periods.value.find((p: any) => `${p.year}-${p.month}` === key); if (current) periodId.value = current.id } } catch {}
}

watch(periodId, () => fetchData())
onMounted(() => fetchPeriods())
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-content-primary">总分类账</h1>
        <p class="text-sm text-content-muted mt-0.5">按期间查看所有已过账凭证</p>
      </div>
      <select v-model="periodId" class="input-base text-sm h-9">
        <option value="" disabled>选择期间</option>
        <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.year }}年{{ p.month }}月</option>
      </select>
    </div>

    <div v-if="!periodId" class="text-center py-12 text-content-muted">请先选择会计期间</div>
    <div v-else-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="items.length === 0" class="text-center py-12 text-content-muted">该期间没有已过账凭证</div>
    <div v-else class="space-y-4">
      <div v-for="v in items" :key="v.id" class="em-card">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ v.voucherNo }}</span>
            <span class="text-xs text-content-muted">{{ v.voucherDate }}</span>
          </div>
          <span class="text-xs text-content-secondary">{{ v.summary }}</span>
        </div>
        <table class="w-full text-xs">
          <thead><tr class="border-b border-line-light/30 text-left text-content-muted"><th class="py-1 px-2">科目</th><th class="py-1 px-2">摘要</th><th class="py-1 px-2 w-28 text-right">借方</th><th class="py-1 px-2 w-28 text-right">贷方</th></tr></thead>
          <tbody>
            <tr v-for="e in v.entries" :key="e.accountCode + e.sort" class="border-b border-line-light/20">
              <td class="py-1 px-2 text-content-secondary">{{ e.accountCode }} {{ e.accountName }}</td>
              <td class="py-1 px-2 text-content-muted">{{ e.summary }}</td>
              <td class="py-1 px-2 text-right text-teal-600">{{ e.debitAmount > 0 ? formatMoney(e.debitAmount) : '' }}</td>
              <td class="py-1 px-2 text-right text-danger-500">{{ e.creditAmount > 0 ? formatMoney(e.creditAmount) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
