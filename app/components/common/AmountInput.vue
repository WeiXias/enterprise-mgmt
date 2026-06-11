<script setup lang="ts">
interface Props { modelValue: number; placeholder?: string; disabled?: boolean }
withDefaults(defineProps<Props>(), { placeholder: '0.00', disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>
<template>
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 pointer-events-none">¥</span>
    <input :value="modelValue" :disabled="disabled" type="number" step="0.01" min="0"
      :placeholder="placeholder"
      class="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:bg-stone-50"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))" />
  </div>
</template>
