<script setup lang="ts">
interface Props { modelValue: number; placeholder?: string; disabled?: boolean }
withDefaults(defineProps<Props>(), { placeholder: '0.00', disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>
<template>
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-content-muted pointer-events-none">¥</span>
    <input :value="modelValue" :disabled="disabled" type="number" step="0.01" min="0"
      :placeholder="placeholder"
      class="w-full pl-7 input-base focus-ring disabled:bg-surface-hover"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))" />
  </div>
</template>
