<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="flex items-center gap-2 mb-3 pt-2 first:pt-0">
    <div class="h-4 w-0.5 rounded-full bg-brand-400" />
    <h2 class="text-sm font-medium text-content-secondary">{{ title }}</h2>
  </div>
</template>
