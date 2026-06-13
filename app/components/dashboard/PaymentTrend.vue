<script setup lang="ts">
interface Trend { month: string; contracted: number; received: number }
interface Props { items: Trend[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
function formatMoney(v: number) { if (!v) return '¥0'; return '¥' + (v / 10000).toFixed(1) + '万' }
const maxAmount = computed(() => Math.max(...props.items.map(i => Math.max(i.contracted, i.received)), 1))
const props = defineProps<Props>()
</script>

<template>
  <div class="warm-card">
    <h3 class="text-sm font-medium text-gray-700 mb-3">回款趋势（近6月）</h3>
    <div v-if="loading" class="h-32 bg-gray-100 rounded-lg animate-pulse" />
    <div v-else-if="items.length === 0" class="text-xs text-gray-400 py-4 text-center">暂无数据</div>
    <div v-else class="space-y-3">
      <div v-for="item in items" :key="item.month" class="flex items-center gap-2">
        <span class="text-xs text-gray-500 w-14 flex-shrink-0">{{ item.month }}</span>
        <div class="flex-1 space-y-0.5">
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-brand-400 rounded-full transition-all" :style="{ width: (item.contracted / maxAmount * 100) + '%' }" />
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full bg-teal-400 rounded-full transition-all" :style="{ width: (item.received / maxAmount * 100) + '%' }" />
          </div>
        </div>
        <div class="text-[10px] text-gray-400 w-16 text-right">
          <p class="text-brand-600">{{ formatMoney(item.contracted) }}</p>
          <p class="text-teal-600">{{ formatMoney(item.received) }}</p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
      <span class="text-[10px] text-gray-400"><span class="inline-block w-2 h-2 bg-brand-400 rounded-full mr-1" />签约</span>
      <span class="text-[10px] text-gray-400"><span class="inline-block w-2 h-2 bg-teal-400 rounded-full mr-1" />回款</span>
    </div>
  </div>
</template>
