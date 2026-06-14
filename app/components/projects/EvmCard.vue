<script setup lang="ts">
const props = defineProps<{ data: any }>()

function formatAmount(v: number) { return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function colorClass(v: number, good: boolean) {
  if (v >= 1) return good ? 'text-teal-600' : 'text-red-500'
  return good ? 'text-red-500' : 'text-teal-600'
}
</script>

<template>
  <div v-if="data" class="grid grid-cols-4 gap-4">
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">PV 计划价值</p>
      <p class="text-lg font-medium text-content-secondary mt-1">{{ formatAmount(data.PV) }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">EV 挣值</p>
      <p class="text-lg font-medium text-content-secondary mt-1">{{ formatAmount(data.EV) }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">AC 实际成本</p>
      <p class="text-lg font-medium text-content-secondary mt-1">{{ formatAmount(data.AC) }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">BAC 预算</p>
      <p class="text-lg font-medium text-content-secondary mt-1">{{ formatAmount(data.budget) }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">SPI 进度绩效</p>
      <p class="text-lg font-medium mt-1" :class="colorClass(data.SPI, true)">{{ data.SPI }}</p>
      <p class="text-xs text-content-muted">{{ data.SPI >= 1 ? '进度超前' : '进度滞后' }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">CPI 成本绩效</p>
      <p class="text-lg font-medium mt-1" :class="colorClass(data.CPI, true)">{{ data.CPI }}</p>
      <p class="text-xs text-content-muted">{{ data.CPI >= 1 ? '成本节约' : '成本超支' }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">SV 进度偏差</p>
      <p class="text-lg font-medium mt-1" :class="data.SV >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatAmount(data.SV) }}</p>
    </div>
    <div class="em-card p-4 text-center">
      <p class="text-xs text-content-muted">CV 成本偏差</p>
      <p class="text-lg font-medium mt-1" :class="data.CV >= 0 ? 'text-teal-600' : 'text-red-500'">{{ formatAmount(data.CV) }}</p>
    </div>
  </div>
</template>
