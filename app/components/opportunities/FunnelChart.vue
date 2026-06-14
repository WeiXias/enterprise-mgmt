<script setup lang="ts">
/**
 * 销售漏斗图组件
 * 可复用条形漏斗，支持点击阶段
 */

interface FunnelStage {
  status: string
  label: string
  count: number
  totalAmount: number
}

interface Props {
  stages: FunnelStage[]
  total: number
  loading?: boolean
  colorMap?: Record<string, string>
  labelMap?: Record<string, string>
}

withDefaults(defineProps<Props>(), {
  loading: false,
  colorMap: () => ({}),
  labelMap: () => ({})
})

const emit = defineEmits<{ 'stage-click': [stage: FunnelStage] }>()

const DEFAULT_COLORS: Record<string, string> = {
  initial_contact: 'bg-gray-400',
  requirement_confirmed: 'bg-brand-400',
  proposal_submitted: 'bg-brand-400',
  business_negotiation: 'bg-orange-400',
  closed_won: 'bg-teal-400',
  closed_lost: 'bg-red-400',
}

const DEFAULT_LABELS: Record<string, string> = {
  initial_contact: '初步接触',
  requirement_confirmed: '需求确认',
  proposal_submitted: '方案提交',
  business_negotiation: '商务谈判',
  closed_won: '已成交',
  closed_lost: '已输单',
}

function getColor(status: string) {
  return (props.colorMap?.[status]) || DEFAULT_COLORS[status] || 'bg-gray-300'
}

function getLabel(status: string) {
  return (props.labelMap?.[status]) || DEFAULT_LABELS[status] || status
}

function formatMoney(v: number) {
  if (!v) return '¥0'
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}

function stageWidth(count: number, total: number) {
  if (!total) return '0%'
  return Math.max((count / total) * 100, 2) + '%'
}

const props = defineProps<Props>()
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-8 text-content-muted">马上就好...</div>
    <div v-else-if="stages.length === 0" class="text-center py-8 text-content-muted">暂无数据</div>
    <div v-else class="space-y-2">
      <div
        v-for="stage in stages"
        :key="stage.status"
        class="flex items-center gap-3 rounded-md p-2 -mx-1 transition-colors"
        :class="stage.status === 'closed_lost' ? 'opacity-40' : 'hover:bg-surface-hover cursor-pointer'"
        @click="emit('stage-click', stage)"
      >
        <!-- 标签 -->
        <span class="w-[5.5rem] flex-shrink-0 text-xs text-content-secondary">{{ getLabel(stage.status) }}</span>

        <!-- 进度条 -->
        <div class="flex-1 h-7 bg-surface-hover rounded-full overflow-hidden">
          <div
            :class="[getColor(stage.status), 'h-full rounded-full transition-all flex items-center justify-end pr-2.5']"
            :style="{ width: stageWidth(stage.count, total) }"
          >
            <span class="text-[11px] text-white font-medium">{{ stage.count }}</span>
          </div>
        </div>

        <!-- 金额 -->
        <span class="w-[6rem] flex-shrink-0 text-xs text-content-muted text-right truncate">{{ formatMoney(stage.totalAmount) }}</span>
      </div>
    </div>
  </div>
</template>
