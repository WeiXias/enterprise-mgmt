<script setup lang="ts">
defineProps<{
  lastReadLabel: string
}>()
</script>

<template>
  <div class="flex items-center gap-3 py-2">
    <div class="flex-1 border-t border-brand-200"></div>
    <span class="text-xs text-brand-600 font-medium whitespace-nowrap">{{ lastReadLabel }}</span>
    <div class="flex-1 border-t border-brand-200"></div>
  </div>
</template>
