<script setup lang="ts">
/**
 * 燃尽图组件 — 剩余任务数趋势可视化
 */
interface Props {
  days: string[]
  actual: number[]
  ideal: number[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const chartWidth = 500
const chartHeight = 200
const padding = { top: 20, right: 20, bottom: 30, left: 40 }
const w = chartWidth - padding.left - padding.right
const h = chartHeight - padding.top - padding.bottom

const maxVal = computed(() => {
  const all = [...props.actual, ...props.ideal]
  return Math.max(...all, 1)
})

const points = computed(() => {
  if (props.days.length < 2) return { actual: '', ideal: '' }
  const n = props.days.length
  const xStep = w / (n - 1)

  function line(values: number[]) {
    return values.map((v, i) => {
      const x = padding.left + i * xStep
      const y = padding.top + h - (v / maxVal.value) * h
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
  }

  return { actual: line(props.actual), ideal: line(props.ideal) }
})

const xLabels = computed(() => {
  const n = props.days.length
  if (n <= 1) return []
  const step = Math.max(1, Math.floor(n / 6))
  return props.days.filter((_, i) => i % step === 0 || i === n - 1).map(d => d.slice(5))
})

const hoverIndex = ref(-1)
function onHover(i: number) { hoverIndex.value = i }

const tooltip = computed(() => {
  if (hoverIndex.value < 0) return null
  return {
    day: props.days[hoverIndex.value],
    actual: props.actual[hoverIndex.value],
    ideal: Math.round(props.ideal[hoverIndex.value] ?? 0),
    x: padding.left + (hoverIndex.value / (props.days.length - 1)) * w,
  }
})
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-8 text-content-muted text-xs">加载中...</div>
    <div v-else-if="days.length === 0" class="text-center py-8 text-content-muted text-xs">暂无数据</div>
    <div v-else class="overflow-x-auto">
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full max-w-lg mx-auto">
        <!-- Grid lines -->
        <line v-for="i in 4" :key="'g'+i" :x1="padding.left" :y1="padding.top + (h/4)*(i-1)" :x2="padding.left+w" :y2="padding.top + (h/4)*(i-1)" stroke="#f0f0f0" stroke-width="0.5" />

        <!-- Axes -->
        <line :x1="padding.left" :y1="padding.top" :x2="padding.left" :y2="padding.top+h" stroke="#d4d4d4" stroke-width="1" />
        <line :x1="padding.left" :y1="padding.top+h" :x2="padding.left+w" :y2="padding.top+h" stroke="#d4d4d4" stroke-width="1" />

        <!-- Y labels -->
        <text v-for="i in 5" :key="'y'+i" :x="padding.left-5" :y="padding.top + (h/4)*(5-i) + 4" text-anchor="end" class="text-[8px] fill-gray-400">{{ Math.round(maxVal * i / 5) }}</text>

        <!-- X labels -->
        <text v-for="(l, i) in xLabels" :key="'x'+i" :x="padding.left + (i / (xLabels.length-1)) * w" :y="padding.top+h+18" text-anchor="middle" class="text-[8px] fill-gray-400">{{ l }}</text>

        <!-- Ideal line (dashed) -->
        <path :d="points.ideal" fill="none" stroke="#d4d4d4" stroke-width="1.5" stroke-dasharray="4,3" />

        <!-- Actual line -->
        <path :d="points.actual" fill="none" stroke="#EF9F27" stroke-width="2" />

        <!-- Hover dots -->
        <circle
          v-for="(v, i) in actual" :key="'d'+i"
          :cx="padding.left + (i/(days.length-1))*w"
          :cy="padding.top + h - (v/maxVal)*h"
          r="3"
          :fill="hoverIndex === i ? '#EF9F27' : 'transparent'"
          class="cursor-pointer transition-colors"
          @mouseenter="onHover(i)"
          @mouseleave="hoverIndex = -1"
        />

        <!-- Tooltip -->
        <g v-if="tooltip">
          <rect :x="tooltip.x - 40" :y="5" width="80" height="10" rx="3" fill="rgba(0,0,0,0.7)" />
          <text :x="tooltip.x" y="14" text-anchor="middle" class="text-[8px] fill-white">实际 {{ tooltip.actual }} / 理想 {{ tooltip.ideal }}</text>
        </g>
      </svg>

      <!-- Legend -->
      <div class="flex items-center justify-center gap-4 mt-2 text-xs">
        <div class="flex items-center gap-1">
          <div class="w-4 h-0.5 bg-brand-400" /><span class="text-content-muted">实际</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-0.5 bg-gray-300 border-t border-dashed border-line" /><span class="text-content-muted">理想</span>
        </div>
      </div>
    </div>
  </div>
</template>
