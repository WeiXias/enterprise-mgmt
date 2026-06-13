<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '应付账龄', middleware: ['auth'] })

const { $api } = useNuxtApp()
const data = ref<any>(null)
const loading = ref(true)

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }

async function fetchData() {
  loading.value = true
  try {
    const res = await $api('/api/finance/ap/aging') as any
    if (res?.code === 0) data.value = res.data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

onMounted(() => { fetchData() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-gray-800">应付账龄分析</h1>
        <p class="text-sm text-gray-400 mt-0.5">看看还有哪些款没付</p>
      </div>
      <NuxtLink to="/dashboard/finance/ap">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm">返回列表</UButton>
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="data">
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="warm-card p-4 text-center">
          <p class="text-2xl font-medium text-gray-800">{{ formatAmount(data.totalAmount) }}</p>
          <p class="text-xs text-gray-400 mt-1">总应付金额</p>
        </div>
        <div class="warm-card p-4 text-center">
          <p class="text-2xl font-medium text-gray-800">{{ data.totalCount }}</p>
          <p class="text-xs text-gray-400 mt-1">应付笔数</p>
        </div>
        <div class="warm-card p-4 text-center">
          <p class="text-2xl font-medium text-red-500">{{ formatAmount(data.buckets.filter((b: any) => b.bucket !== 'current').reduce((s: number, b: any) => s + b.amount, 0)) }}</p>
          <p class="text-xs text-gray-400 mt-1">逾期金额</p>
        </div>
      </div>

      <div class="warm-card">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 text-gray-400">
              <th class="text-left py-3 font-normal">账龄</th>
              <th class="text-right py-3 font-normal">供应商数</th>
              <th class="text-right py-3 font-normal">笔数</th>
              <th class="text-right py-3 font-normal">金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in data.buckets" :key="b.bucket" class="border-b border-gray-50">
              <td class="py-3 text-gray-700">{{ b.label }}</td>
              <td class="text-right py-3 text-gray-700">{{ b.supplierCount }}</td>
              <td class="text-right py-3 text-gray-700">{{ b.count }}</td>
              <td class="text-right py-3" :class="b.bucket !== 'current' ? 'text-red-500 font-medium' : 'text-gray-700'">{{ formatAmount(b.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
