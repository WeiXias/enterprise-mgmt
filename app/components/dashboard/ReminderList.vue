<script setup lang="ts">
interface Reminder { label: string; count: number; bgClass: string; textClass: string; to: string }
interface Props { items: Reminder[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
</script>

<template>
  <div class="em-card">
    <h3 class="text-sm font-medium text-content-secondary mb-4">今日提醒</h3>
    <div v-if="loading" class="space-y-2"> <div v-for="i in 3" :key="i" class="h-10 bg-line rounded-md animate-pulse" /> </div>
    <div v-else-if="items.length === 0" class="text-xs text-content-muted py-4 text-center">今天没有需要处理的事项</div>
    <div v-else class="space-y-2">
      <NuxtLink v-for="r in items" :key="r.label" :to="r.to" :class="['flex items-center justify-between p-3 rounded-md hover:shadow-sm transition-all', r.bgClass]">
        <span class="text-sm text-content-secondary">{{ r.label }}</span>
        <span :class="['text-sm font-medium', r.textClass]">{{ r.count }} 个</span>
      </NuxtLink>
    </div>
  </div>
</template>
