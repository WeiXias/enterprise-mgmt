<script setup lang="ts">
interface Props {
  modelValue: { amount: number; adjustReason: string }
  originalAmount?: number; loading?: boolean
}
withDefaults(defineProps<Props>(), { originalAmount: 0, loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
</script>

<template>
  <form class="space-y-3" @submit.prevent="$emit('submit')">
    <div><label class="block text-sm text-gray-600 mb-1">调整后金额</label><AmountInput :modelValue="modelValue.amount" @update:modelValue="(v: number) => $emit('update:modelValue', { ...modelValue, amount: v })" /></div>
    <div><label class="block text-sm text-gray-600 mb-1">调整原因 <span class="text-red-400">*</span></label><textarea :value="modelValue.adjustReason" rows="2" placeholder="说明调整原因..." class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none" @input="$emit('update:modelValue', { ...modelValue, adjustReason: ($event.target as HTMLTextAreaElement).value })" /></div>
  </form>
</template>
