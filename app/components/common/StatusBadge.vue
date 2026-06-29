<script setup lang="ts">
import { useEnum } from '~/composables/useEnum'

interface Props {
  value: string
  enumType: string
}

const props = defineProps<Props>()
const { getLabel } = useEnum()

const colorMap: Record<string, { bg: string; text: string }> = {
  // 客户状态
  potential: { bg: 'bg-surface-hover', text: 'text-content-muted' },
  intentional: { bg: 'bg-brand-50', text: 'text-brand-600' },
  closed: { bg: 'bg-teal-50', text: 'text-teal-600' },
  lost: { bg: 'bg-red-50', text: 'text-red-500' },
  // 商机状态
  initial_contact: { bg: 'bg-surface-hover', text: 'text-content-muted' },
  requirement_confirmed: { bg: 'bg-brand-50', text: 'text-brand-500' },
  proposal_submitted: { bg: 'bg-brand-50', text: 'text-brand-600' },
  business_negotiation: { bg: 'bg-purple-50', text: 'text-purple-500' },
  closed_won: { bg: 'bg-teal-50', text: 'text-teal-600' },
  closed_lost: { bg: 'bg-red-50', text: 'text-red-500' },
  // 合同状态
  draft: { bg: 'bg-surface-hover', text: 'text-content-muted' },
  approved: { bg: 'bg-brand-50', text: 'text-brand-500' },
  in_progress: { bg: 'bg-brand-50', text: 'text-brand-600' },
  completed: { bg: 'bg-teal-50', text: 'text-teal-600' },
  terminated: { bg: 'bg-red-50', text: 'text-red-500' },
  // 项目状态
  not_started: { bg: 'bg-surface-hover', text: 'text-content-muted' },
  delayed: { bg: 'bg-red-50', text: 'text-red-500' },
  // 任务
  todo: { bg: 'bg-surface-hover', text: 'text-content-muted' },
  // 产品
  on_sale: { bg: 'bg-teal-50', text: 'text-teal-600' },
  off_shelf: { bg: 'bg-surface-hover', text: 'text-content-muted' },
  // 提成
  pending: { bg: 'bg-brand-50', text: 'text-brand-600' },
  rejected: { bg: 'bg-red-50', text: 'text-red-500' },
  paid: { bg: 'bg-brand-50', text: 'text-brand-500' },
  // 盘点
  counting: { bg: 'bg-brand-50', text: 'text-brand-600' },
  counted: { bg: 'bg-brand-50', text: 'text-brand-500' },
  reviewed: { bg: 'bg-teal-50', text: 'text-teal-600' },
  // 采购订单
  submitted: { bg: 'bg-brand-50', text: 'text-brand-600' },
  received: { bg: 'bg-teal-50', text: 'text-teal-600' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-500' },
}

const colors = computed(() => colorMap[props.value] || { bg: 'bg-surface-hover', text: 'text-content-muted' })
</script>

<template>
  <span :class="['inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal', colors.bg, colors.text]">
    {{ getLabel(enumType, value) }}
  </span>
</template>
