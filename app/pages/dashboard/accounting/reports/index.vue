<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '财务报表', middleware: ['auth'] })

const { $api } = useNuxtApp()
const activeTab = ref('income')

const incomeData = ref<any>(null)
const balanceData = ref<any>(null)
const loading = ref(true)

async function fetchData() {
  loading.value = true
  try {
    const [isRes, bsRes] = await Promise.all([
      $api('/api/accounting/reports/income-statement') as any,
      $api('/api/accounting/reports/balance-sheet') as any,
    ])
    if (isRes?.code === 0) incomeData.value = isRes.data
    if (bsRes?.code === 0) balanceData.value = bsRes.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

onMounted(() => { fetchData() })
</script>

<template>
  <div>
    <CommonPageHeader title="财务报表" description="利润表 + 资产负债表" />

    <div class="flex gap-2 mb-4">
      <UButton :variant="activeTab === 'income' ? 'solid' : 'ghost'" :color="activeTab === 'income' ? 'primary' : 'neutral'" size="sm" @click="activeTab = 'income'">利润表</UButton>
      <UButton :variant="activeTab === 'balance' ? 'solid' : 'ghost'" :color="activeTab === 'balance' ? 'primary' : 'neutral'" size="sm" @click="activeTab = 'balance'">资产负债表</UButton>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>

    <div v-else-if="activeTab === 'income' && incomeData" class="warm-card p-6 max-w-md mx-auto">
      <h2 class="text-lg font-medium text-gray-800 mb-4 text-center">利润表</h2>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between py-1"><span class="text-gray-500">营业收入</span><span class="text-gray-700">{{ formatAmount(incomeData.totalIncome) }}</span></div>
        <div class="flex justify-between py-1"><span class="text-gray-500">营业支出</span><span class="text-gray-700">{{ formatAmount(incomeData.totalExpense) }}</span></div>
        <div class="border-t border-gray-100 pt-2 flex justify-between font-medium"><span class="text-gray-800">净利润</span><span :class="incomeData.netIncome >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatAmount(incomeData.netIncome) }}</span></div>
      </div>
    </div>

    <div v-else-if="activeTab === 'balance' && balanceData" class="warm-card p-6 max-w-md mx-auto">
      <h2 class="text-lg font-medium text-gray-800 mb-4 text-center">资产负债表</h2>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between py-1"><span class="text-gray-500">资产</span><span class="text-blue-600">{{ formatAmount(balanceData.assets) }}</span></div>
        <div class="flex justify-between py-1"><span class="text-gray-500">负债</span><span class="text-amber-600">{{ formatAmount(balanceData.liabilities) }}</span></div>
        <div class="flex justify-between py-1"><span class="text-gray-500">所有者权益</span><span class="text-teal-600">{{ formatAmount(balanceData.equity) }}</span></div>
        <div class="border-t border-gray-100 pt-2 flex justify-between text-xs">
          <span class="text-gray-400">平衡校验</span>
          <span :class="balanceData.check ? 'text-teal-500' : 'text-red-500'">{{ balanceData.check ? '资产 = 负债 + 权益 ✓' : '不平！' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
