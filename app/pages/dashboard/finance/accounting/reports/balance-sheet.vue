<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '资产负债表', middleware: ['auth'], watermark: true })

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
    const res = await $api('/api/accounting/reports/balance-sheet', { params: { periodId: periodId.value } }) as any
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
        <h1 class="text-lg font-medium text-content-primary">资产负债表</h1>
        <p class="text-sm text-content-muted mt-0.5">资产 = 负债 + 所有者权益</p>
      </div>
      <select v-model="periodId" class="input-base text-sm h-9">
        <option value="" disabled>选择期间</option>
        <option v-for="p in periods" :key="p.id" :value="p.id">{{ p.year }}年{{ p.month }}月</option>
      </select>
    </div>

    <div v-if="!periodId" class="text-center py-12 text-content-muted">请先选择会计期间</div>
    <div v-else-if="loading" class="py-4"><ListSkeleton /></div>
    <div v-else-if="data" class="grid grid-cols-2 gap-6">
      <!-- 资产 -->
      <div>
        <div class="em-card mb-4">
          <h3 class="text-sm font-medium text-content-primary mb-2">{{ data.assets.label }}</h3>
          <div v-for="item in data.assets.items" :key="item.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
            <span class="text-content-secondary">{{ item.code }} {{ item.name }}</span>
            <span class="font-medium" :class="item.amount >= 0 ? 'text-teal-600' : 'text-danger-500'">{{ formatMoney(item.amount) }}</span>
          </div>
          <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1"><span>流动资产合计</span><span class="text-teal-600">{{ formatMoney(data.assets.total) }}</span></div>
        </div>
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-2">{{ data.nonCurrentAssets.label }}</h3>
          <div v-for="item in data.nonCurrentAssets.items" :key="item.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
            <span class="text-content-secondary">{{ item.code }} {{ item.name }}</span>
            <span class="font-medium" :class="item.amount >= 0 ? 'text-teal-600' : 'text-danger-500'">{{ formatMoney(item.amount) }}</span>
          </div>
          <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1"><span>非流动资产合计</span><span class="text-teal-600">{{ formatMoney(data.nonCurrentAssets.total) }}</span></div>
        </div>
        <div class="em-card mt-4 !bg-teal-50 flex justify-between py-2 px-3 text-sm font-medium"><span>资产总计</span><span class="text-teal-600">{{ formatMoney(data.totalAssets) }}</span></div>
      </div>

      <!-- 负债 + 权益 -->
      <div>
        <div class="em-card mb-4">
          <h3 class="text-sm font-medium text-content-primary mb-2">{{ data.currentLiabilities.label }}</h3>
          <div v-for="item in data.currentLiabilities.items" :key="item.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
            <span class="text-content-secondary">{{ item.code }} {{ item.name }}</span>
            <span class="font-medium text-content-primary">{{ formatMoney(item.amount) }}</span>
          </div>
          <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1"><span>流动负债合计</span><span>{{ formatMoney(data.currentLiabilities.total) }}</span></div>
        </div>
        <div class="em-card mb-4">
          <h3 class="text-sm font-medium text-content-primary mb-2">{{ data.nonCurrentLiabilities.label }}</h3>
          <div v-for="item in data.nonCurrentLiabilities.items" :key="item.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
            <span class="text-content-secondary">{{ item.code }} {{ item.name }}</span>
            <span class="font-medium text-content-primary">{{ formatMoney(item.amount) }}</span>
          </div>
          <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1"><span>非流动负债合计</span><span>{{ formatMoney(data.nonCurrentLiabilities.total) }}</span></div>
        </div>
        <div class="em-card">
          <h3 class="text-sm font-medium text-content-primary mb-2">{{ data.equity.label }}</h3>
          <div v-for="item in data.equity.items" :key="item.code" class="flex justify-between py-1 text-xs border-b border-line-light/30">
            <span class="text-content-secondary">{{ item.code }} {{ item.name }}</span>
            <span class="font-medium text-content-primary">{{ formatMoney(item.amount) }}</span>
          </div>
          <div class="flex justify-between py-1.5 text-sm font-medium border-t border-line mt-1"><span>所有者权益合计</span><span>{{ formatMoney(data.equity.total) }}</span></div>
        </div>
        <div class="em-card mt-4 !bg-brand-50 flex justify-between py-2 px-3 text-sm font-medium"><span>负债 + 权益总计</span><span :class="data.isBalanced ? 'text-teal-600' : 'text-danger-500'">{{ formatMoney(data.totalLiabilitiesAndEquity) }}</span></div>
      </div>
    </div>
  </div>
</template>
