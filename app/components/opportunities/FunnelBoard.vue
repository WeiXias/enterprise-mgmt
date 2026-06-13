<script setup lang="ts">
interface FunnelStage { status: string; label: string; count: number; totalAmount: number }
interface Props { stages: FunnelStage[]; total: number; winRate?: number; loading?: boolean }
withDefaults(defineProps<Props>(), { winRate: 0, loading: false })
const emit = defineEmits<{ 'stage-click': [stage: FunnelStage] }>()
function formatMoney(v: number) { if (!v) return '¥0'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
</script>

<template>
  <div class="warm-card">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-gray-700">销售漏斗</h3>
      <span class="text-xs text-gray-400">共 {{ total }} 个商机 | 赢单率 {{ Math.round(winRate * 100) }}%</span>
    </div>
    <FunnelChart :stages="stages" :total="total" :loading="loading" @stage-click="(s: FunnelStage) => $emit('stage-click', s)" />
  </div>
</template>
