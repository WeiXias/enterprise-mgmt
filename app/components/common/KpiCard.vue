<script setup lang="ts">
defineProps<{ to?: string; value: number | string; label: string; icon: string; color: string; format?: (v: any) => string }>()
</script>

<template>
  <component :is="to ? 'a' : 'div'" :href="to" class="em-card flex items-center gap-3" :class="to ? 'hover:shadow-sm transition-shadow cursor-pointer' : ''">
    <div :class="['w-10 h-10 rounded-md flex items-center justify-center', color.split(' ')[0]]"><UIcon :name="icon" :class="['w-5 h-5', color.split(' ')[1]]" /></div>
    <div>
      <p class="text-lg font-medium text-content-primary">{{ format ? format(value) : value }}</p>
      <p class="text-xs text-content-secondary">{{ label }}</p>
    </div>
  </component>
</template>
