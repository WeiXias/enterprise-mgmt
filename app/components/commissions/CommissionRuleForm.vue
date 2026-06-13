<script setup lang="ts">
interface Props {
  modelValue: { name: string; baseType: string; rate: number; productId?: string; minAmount?: number; maxAmount?: number; priority?: number }
  productOptions?: { id: string; name: string }[]; loading?: boolean
}
withDefaults(defineProps<Props>(), { productOptions: () => [], loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div><label class="block text-sm text-gray-600 mb-1">规则名称 <span class="text-red-400">*</span></label><input :value="modelValue.name" type="text" placeholder="如：通用提成规则" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400" @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })" /></div>
    <div><label class="block text-sm text-gray-600 mb-1">提成基数</label>
      <select :value="modelValue.baseType" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 bg-white" @change="$emit('update:modelValue', { ...modelValue, baseType: ($event.target as HTMLSelectElement).value })">
        <option value="contract_amount">按合同金额</option><option value="received_amount">按回款金额</option></select></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="block text-sm text-gray-600 mb-1">提成比例 (%)</label><input :value="modelValue.rate * 100" type="number" step="0.1" min="0" max="100" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, rate: Number(($event.target as HTMLInputElement).value) / 100 })" /></div>
      <div><label class="block text-sm text-gray-600 mb-1">优先级</label><input :value="modelValue.priority" type="number" min="0" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, priority: Number(($event.target as HTMLInputElement).value) })" /></div>
    </div>
    <div><label class="block text-sm text-gray-600 mb-1">适用产品</label><select :value="modelValue.productId" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 bg-white" @change="$emit('update:modelValue', { ...modelValue, productId: ($event.target as HTMLSelectElement).value })"><option value="">全部产品</option><option v-for="p in productOptions" :key="p.id" :value="p.id">{{ p.name }}</option></select></div>
    <div class="grid grid-cols-2 gap-3"><div><label class="block text-sm text-gray-600 mb-1">阶梯下限</label><input :value="modelValue.minAmount" type="number" step="0.01" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, minAmount: Number(($event.target as HTMLInputElement).value) })" /></div><div><label class="block text-sm text-gray-600 mb-1">阶梯上限</label><input :value="modelValue.maxAmount" type="number" step="0.01" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, maxAmount: Number(($event.target as HTMLInputElement).value) })" /></div></div>
  </form>
</template>
