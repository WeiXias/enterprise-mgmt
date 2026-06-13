<script setup lang="ts">
interface Props {
  modelValue: { name: string; phone?: string; email?: string; position?: string; isPrimary?: boolean; remark?: string }
  loading?: boolean
}
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ 'update:modelValue': [value: any]; submit: [] }>()
</script>

<template>
  <form class="space-y-3" @submit.prevent="$emit('submit')">
    <div>
      <label class="block text-sm text-gray-600 mb-1">姓名 <span class="text-red-400">*</span></label>
      <input :value="modelValue.name" type="text" placeholder="联系人姓名"
        class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        @input="$emit('update:modelValue', { ...modelValue, name: ($event.target as HTMLInputElement).value })" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="block text-xs text-gray-400 mb-1">职位</label><input :value="modelValue.position" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, position: ($event.target as HTMLInputElement).value })" /></div>
      <div><label class="block text-xs text-gray-400 mb-1">电话</label><input :value="modelValue.phone" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, phone: ($event.target as HTMLInputElement).value })" /></div>
    </div>
    <div><label class="block text-xs text-gray-400 mb-1">邮箱</label><input :value="modelValue.email" type="email" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, email: ($event.target as HTMLInputElement).value })" /></div>
    <label class="flex items-center gap-2 text-sm text-gray-600">
      <input type="checkbox" :checked="modelValue.isPrimary" class="rounded border-gray-300 text-brand-500 focus:ring-brand-400" @change="$emit('update:modelValue', { ...modelValue, isPrimary: ($event.target as HTMLInputElement).checked })" /> 设为主要联系人
    </label>
    <div><label class="block text-xs text-gray-400 mb-1">备注</label><input :value="modelValue.remark" type="text" class="w-full px-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" @input="$emit('update:modelValue', { ...modelValue, remark: ($event.target as HTMLInputElement).value })" /></div>
  </form>
</template>
