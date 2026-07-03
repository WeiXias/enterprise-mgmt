<script setup lang="ts">
/**
 * 日期范围选择器 — 两个 date input，统一使用 input-base 样式
 * 用法: <DateRangePicker v-model:start-date="start" v-model:end-date="end" />
 */

interface Props {
  startDate: string
  endDate: string
  /** 紧凑模式：用于列表筛选栏 */
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  compact: false,
})

const emit = defineEmits<{
  'update:startDate': [value: string]
  'update:endDate': [value: string]
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      type="date"
      :value="startDate"
      :class="['w-36 input-base focus-ring', compact ? 'text-xs' : 'text-sm']"
      placeholder="开始日期"
      @input="emit('update:startDate', ($event.target as HTMLInputElement).value)"
    />
    <span class="text-content-muted text-sm">{{ compact ? '~' : '—' }}</span>
    <input
      type="date"
      :value="endDate"
      :class="['w-36 input-base focus-ring', compact ? 'text-xs' : 'text-sm']"
      placeholder="结束日期"
      @input="emit('update:endDate', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
