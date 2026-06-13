<script setup lang="ts">
const props = defineProps<{
  budget: number
  income: number
  estimatedCost: number
  estimatedHours: number
  remaining: number
  budgetUsage: number
  isWarn: boolean
  loading?: boolean
}>()

function formatMoney(v: number) {
  if (!v) return '¥0'
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 0 })
}
</script>

<template>
  <div class="warm-card">
    <h3 class="text-sm font-medium text-gray-700 mb-3">预算概览</h3>
    <div v-if="loading" class="text-center py-4 text-gray-400 text-xs">加载中...</div>
    <div v-else>
      <!-- 进度条 -->
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-gray-400">预算使用</span>
          <span :class="['font-medium', isWarn ? 'text-red-500' : 'text-gray-600']">{{ budgetUsage }}%</span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div :class="['h-full rounded-full transition-all', isWarn ? 'bg-red-400' : 'bg-brand-400']" :style="{ width: Math.min(budgetUsage, 100) + '%' }" />
        </div>
        <p v-if="isWarn" class="text-[10px] text-red-400 mt-0.5">预算使用已超 80%，请注意控制</p>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2 rounded-lg bg-gray-50">
          <p class="text-gray-400">总预算</p>
          <p class="text-gray-700 font-medium">{{ formatMoney(budget) }}</p>
        </div>
        <div class="p-2 rounded-lg bg-gray-50">
          <p class="text-gray-400">已到账</p>
          <p class="text-teal-600 font-medium">{{ formatMoney(income) }}</p>
        </div>
        <div class="p-2 rounded-lg bg-gray-50">
          <p class="text-gray-400">预估成本</p>
          <p class="text-gray-700 font-medium">{{ formatMoney(estimatedCost) }}</p>
        </div>
        <div :class="['p-2 rounded-lg', remaining >= 0 ? 'bg-gray-50' : 'bg-red-50']">
          <p class="text-gray-400">剩余</p>
          <p :class="['font-medium', remaining >= 0 ? 'text-gray-700' : 'text-red-500']">{{ formatMoney(remaining) }}</p>
        </div>
      </div>

      <div class="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
        已登记 {{ estimatedHours }}h 工时（按 ¥500/h 估算）
      </div>
    </div>
  </div>
</template>
