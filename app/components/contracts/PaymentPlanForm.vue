<script setup lang="ts">
interface Props {
  modelValue: { amount: number; planDate: string; remark?: string }
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
</script>

<template>
  <form class="space-y-3" @submit.prevent="$emit('submit')">
    <div><label class="block text-sm text-stone-600 mb-1">收款金额 <span class="text-red-400">*</span></label>
      <AmountInput :modelValue="modelValue.amount" @update:modelValue="(v: number) => $emit('update:modelValue', { ...modelValue, amount: v })" /></div>
    <div><label class="block text-sm text-stone-600 mb-1">计划收款日期 <span class="text-red-400">*</span></label>
      <input :value="modelValue.planDate" type="date" class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" @input="$emit('update:modelValue', { ...modelValue, planDate: ($event.target as HTMLInputElement).value })" /></div>
    <div><label class="block text-sm text-stone-600 mb-1">备注</label>
      <input :value="modelValue.remark" type="text" placeholder="备注信息..." class="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLInputElement).value })" /></div>
  </form>
</template>
