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
  potential: { bg: 'bg-gray-50', text: 'text-gray-500' },
  intentional: { bg: 'bg-brand-50', text: 'text-brand-600' },
  closed: { bg: 'bg-teal-50', text: 'text-teal-600' },
  lost: { bg: 'bg-red-50', text: 'text-red-500' },
  // 商机状态
  initial_contact: { bg: 'bg-gray-50', text: 'text-gray-500' },
  requirement_confirmed: { bg: 'bg-blue-50', text: 'text-blue-500' },
  proposal_submitted: { bg: 'bg-brand-50', text: 'text-brand-600' },
  business_negotiation: { bg: 'bg-purple-50', text: 'text-purple-500' },
  closed_won: { bg: 'bg-teal-50', text: 'text-teal-600' },
  closed_lost: { bg: 'bg-red-50', text: 'text-red-500' },
  // 合同状态
  draft: { bg: 'bg-gray-50', text: 'text-gray-500' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-500' },
  in_progress: { bg: 'bg-brand-50', text: 'text-brand-600' },
  completed: { bg: 'bg-teal-50', text: 'text-teal-600' },
  terminated: { bg: 'bg-red-50', text: 'text-red-500' },
  // 项目状态
  not_started: { bg: 'bg-gray-50', text: 'text-gray-500' },
  delayed: { bg: 'bg-red-50', text: 'text-red-500' },
  // 任务
  todo: { bg: 'bg-gray-50', text: 'text-gray-500' },
  // 产品
  on_sale: { bg: 'bg-teal-50', text: 'text-teal-600' },
  off_shelf: { bg: 'bg-gray-50', text: 'text-gray-500' },
  // 提成
  pending: { bg: 'bg-brand-50', text: 'text-brand-600' },
  rejected: { bg: 'bg-red-50', text: 'text-red-500' },
  paid: { bg: 'bg-blue-50', text: 'text-blue-500' }
}

const colors = computed(() => colorMap[props.value] || { bg: 'bg-gray-50', text: 'text-gray-500' })
</script>

<template>
  <span :class="['inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal', colors.bg, colors.text]">
    {{ getLabel(enumType, value) }}
  </span>
</template>
