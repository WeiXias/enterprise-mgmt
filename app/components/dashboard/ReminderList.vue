<script setup lang="ts">
interface Reminder { label: string; count: number; bgClass: string; textClass: string }
interface Props { items: Reminder[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
</script>

<template>
  <div class="warm-card">
    <h3 class="text-sm font-medium text-stone-700 mb-3">今日提醒</h3>
    <div v-if="loading" class="space-y-2"> <div v-for="i in 3" :key="i" class="h-10 bg-stone-200 rounded-lg animate-pulse" /> </div>
    <div v-else-if="items.length === 0" class="text-xs text-stone-400 py-4 text-center">今天没有需要处理的事项</div>
    <div v-else class="space-y-2">
      <div v-for="r in items" :key="r.label" :class="['flex items-center justify-between p-2 rounded-lg', r.bgClass]">
        <span class="text-sm text-stone-700">{{ r.label }}</span>
        <span :class="['text-sm font-medium', r.textClass]">{{ r.count }} 个</span>
      </div>
    </div>
  </div>
</template>
