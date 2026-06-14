<script setup lang="ts">
interface Props {
  modelValue: { name: string; code: string; categoryId?: string; standardPrice: number; costPrice: number; description?: string }
  categories?: { id: string; name: string }[]; loading?: boolean
}
withDefaults(defineProps<Props>(), { categories: () => [], loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
</script>

<template>
  <form class="space-y-4" @submit.prevent="$emit('submit')">
    <div><label class="block text-sm text-content-secondary mb-1">名称 <span class="text-red-400">*</span></label><input :value="modelValue.name" type="text" placeholder="产品名称" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })" /></div>
    <div><label class="block text-sm text-content-secondary mb-1">编码 <span class="text-red-400">*</span></label><input :value="modelValue.code" type="text" placeholder="SKU-001" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, code: ($event.target as HTMLInputElement).value })" /></div>
    <div><label class="block text-sm text-content-secondary mb-1">分类</label><EnumSelect :model-value="modelValue.categoryId || ''" :options="categories.map(c => ({ value: c.id, label: c.name }))" placeholder="无分类" @update:model-value="$emit('update:modelValue', { ...modelValue, categoryId: $event })" /></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="block text-sm text-content-secondary mb-1">标准售价</label><input :value="modelValue.standardPrice" type="number" step="0.01" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, standardPrice: Number(($event.target as HTMLInputElement).value) })" /></div>
      <div><label class="block text-sm text-content-secondary mb-1">成本价</label><input :value="modelValue.costPrice" type="number" step="0.01" class="w-full input-base focus-ring" @input="$emit('update:modelValue', { ...modelValue, costPrice: Number(($event.target as HTMLInputElement).value) })" /></div>
    </div>
    <div><label class="block text-sm text-content-secondary mb-1">描述</label><textarea :value="modelValue.description" rows="2" placeholder="产品描述..." class="w-full px-3 py-2 text-sm rounded-md border border-line focus-ring resize-none" @input="$emit('update:modelValue', { ...modelValue, description: ($event.target as HTMLTextAreaElement).value })" /></div>
  </form>
</template>
