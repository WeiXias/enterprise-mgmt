<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '利润表', middleware: ['auth'], watermark: true })

const toast = useToast()
const { $api } = useNuxtApp()
const data = ref<any>(null)
const loading = ref(true)
const periods = ref<any[]>([])
const periodId = ref('')

function formatMoney(v: any) { const n = Number(v); if (!n) return '-'; return '¥' + n.toLocaleString('zh-CN') }

async function fetchData() {
  if (!periodId.value) return
  loading.value = true
  try {
    const res = await $api('/api/accounting/reports/income-statement', { params: { periodId: periodId.value } }) as any
    if (res?.code === 0) data.value = res.data
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
        <h1 class="text-lg font-medium text-content-primary">利润表</h1>
        <p class="text-sm text-content-muted mt-0.5">期间的经营成果</p>
      </div>
      <select v-model="periodId" class="input-base text-sm h-9">
        <option value="" disabled>选择期间</option>
        <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.year }}年{{ p.month }}月</option>
      </select>
    </div>

    <div v-if="!periodId" class="text-center py-12 text-content-muted">请先选择会计期间</div>
    <div v-else-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="data" class="max-w-xl mx-auto">
      <div class="em-card">
        <!-- 收入 -->
        <h3 class="text-sm font-medium text-content-primary mb-2">一、营业收入</h3>
        <div v-for="r in data.revenue" :key="r.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
          <span class="text-content-secondary">{{ r.code }} {{ r.name }}</span>
          <span class="text-teal-600 font-medium">{{ formatMoney(r.amount) }}</span>
        </div>
        <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1 mb-4">
          <span>营业收入合计</span><span class="text-teal-600">{{ formatMoney(data.totals.totalRevenue) }}</span>
        </div>

        <!-- 费用 -->
        <h3 class="text-sm font-medium text-content-primary mb-2">二、营业成本和费用</h3>
        <div v-for="r in data.expense" :key="r.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
          <span class="text-content-secondary">{{ r.code }} {{ r.name }}</span>
          <span class="text-danger-500 font-medium">{{ formatMoney(r.amount) }}</span>
        </div>
        <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1 mb-4">
          <span>营业总成本和费用</span><span class="text-danger-500">{{ formatMoney(data.totals.totalExpense) }}</span>
        </div>

        <!-- 利润 -->
        <div class="flex justify-between py-2 px-3 rounded-md text-sm font-medium" :class="data.totals.netProfit >= 0 ? 'bg-teal-50 text-teal-700' : 'bg-danger-50 text-danger-600'">
          <span>{{ data.totals.netProfit >= 0 ? '三、净利润' : '三、净亏损' }}</span>
          <span>{{ formatMoney(Math.abs(data.totals.netProfit)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
