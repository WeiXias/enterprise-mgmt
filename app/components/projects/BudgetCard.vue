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
  <div class="em-card">
    <h3 class="text-sm font-medium text-content-secondary mb-3">预算概览</h3>
    <div v-if="loading" class="text-center py-4 text-content-muted text-xs">加载中...</div>
    <div v-else>
      <!-- 进度条 -->
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-content-muted">预算使用</span>
          <span :class="['font-medium', isWarn ? 'text-red-500' : 'text-content-secondary']">{{ budgetUsage }}%</span>
        </div>
        <div class="h-2 bg-surface-hover rounded-full overflow-hidden">
          <div :class="['h-full rounded-full transition-all', isWarn ? 'bg-red-400' : 'bg-brand-400']" :style="{ width: Math.min(budgetUsage, 100) + '%' }" />
        </div>
        <p v-if="isWarn" class="text-[10px] text-red-400 mt-0.5">预算使用已超 80%，请注意控制</p>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div class="p-2 rounded-md bg-surface-hover">
          <p class="text-content-muted">总预算</p>
          <p class="text-content-secondary font-medium">{{ formatMoney(budget) }}</p>
        </div>
        <div class="p-2 rounded-md bg-surface-hover">
          <p class="text-content-muted">已到账</p>
          <p class="text-teal-600 font-medium">{{ formatMoney(income) }}</p>
        </div>
        <div class="p-2 rounded-md bg-surface-hover">
          <p class="text-content-muted">预估成本</p>
          <p class="text-content-secondary font-medium">{{ formatMoney(estimatedCost) }}</p>
        </div>
        <div :class="['p-2 rounded-md', remaining >= 0 ? 'bg-surface-hover' : 'bg-red-50']">
          <p class="text-content-muted">剩余</p>
          <p :class="['font-medium', remaining >= 0 ? 'text-content-secondary' : 'text-red-500']">{{ formatMoney(remaining) }}</p>
        </div>
      </div>

      <div class="mt-2 pt-2 border-t border-line-light text-[10px] text-content-muted">
        已登记 {{ estimatedHours }}h 工时（按 ¥500/h 估算）
      </div>
    </div>
  </div>
</template>
