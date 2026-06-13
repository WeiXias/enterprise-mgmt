<script setup lang="ts">
interface KpiItem {
  label: string
  value: string | number
  icon: string
  colorClass: string
  bgClass: string
  to: string
}

interface Props { items: KpiItem[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
</script>

<template>
  <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
    <div v-for="i in 6" :key="i" class="card animate-pulse"><div class="h-8 w-8 bg-gray-200 rounded-lg" /><div class="mt-1.5 space-y-1"><div class="h-3 bg-gray-200 rounded w-14" /><div class="h-2 bg-gray-100 rounded w-20" /></div></div>
  </div>
  <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
    <NuxtLink v-for="item in items" :key="item.label" :to="item.to" class="card flex items-center gap-3 hover:shadow-md transition-shadow">
      <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', item.bgClass]">
        <UIcon :name="item.icon" :class="['w-4.5 h-4.5', item.colorClass]" />
      </div>
      <div>
        <p class="text-lg font-medium" :class="[item.colorClass]">{{ item.value }}</p>
        <p class="text-[11px] text-gray-500">{{ item.label }}</p>
      </div>
    </NuxtLink>
  </div>
</template>
