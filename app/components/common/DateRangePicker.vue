<script setup lang="ts">
/**
 * 日期范围选择器 — 两个 date input
 * 用法: <DateRangePicker v-model:start-date="start" v-model:end-date="end" />
 */

interface Props {
  startDate: string
  endDate: string
  startLabel?: string
  endLabel?: string
}

withDefaults(defineProps<Props>(), {
  startLabel: '从',
  endLabel: '到',
})

const emit = defineEmits<{
  'update:startDate': [value: string]
  'update:endDate': [value: string]
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1.5">
      <label class="text-xs text-content-muted flex-shrink-0">{{ startLabel }}</label>
      <input
        :value="startDate"
        type="date"
        class="px-2 py-1.5 text-sm rounded-md border border-line focus-ring bg-surface-card"
        @input="$emit('update:startDate', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <span class="text-xs text-content-muted">—</span>
    <div class="flex items-center gap-1.5">
      <label class="text-xs text-content-muted flex-shrink-0">{{ endLabel }}</label>
      <input
        :value="endDate"
        type="date"
        class="px-2 py-1.5 text-sm rounded-md border border-line focus-ring bg-surface-card"
        @input="$emit('update:endDate', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
