<script setup lang="ts">
interface KpiItem {
  label: string
  value: string | number
  icon: string
  colorClass: string
  bgClass: string
}

interface Props { items: KpiItem[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
</script>

<template>
  <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div v-for="i in 4" :key="i" class="warm-card animate-pulse"><div class="h-10 w-10 bg-stone-200 rounded-lg" /><div class="mt-2 space-y-1"><div class="h-4 bg-stone-200 rounded w-16" /><div class="h-3 bg-stone-100 rounded w-24" /></div></div>
  </div>
  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div v-for="item in items" :key="item.label" class="warm-card flex items-center gap-4">
      <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', item.bgClass]">
        <UIcon :name="item.icon" :class="['w-5 h-5', item.colorClass]" />
      </div>
      <div>
        <p class="text-xl font-semibold" :class="[item.colorClass]">{{ item.value }}</p>
        <p class="text-xs text-stone-400">{{ item.label }}</p>
      </div>
    </div>
  </div>
</template>
