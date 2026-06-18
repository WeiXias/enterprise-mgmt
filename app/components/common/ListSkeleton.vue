<template>
  <div class="space-y-2">
    <div v-for="i in 4" :key="i" class="em-card flex items-center gap-4 animate-pulse">
      <div class="w-1 h-10 rounded-full bg-line flex-shrink-0" />
      <div class="flex-1 space-y-2">
        <div class="h-3 bg-line rounded w-1/3" />
        <div class="h-2 bg-surface-hover rounded w-1/2" />
      </div>
    </div>
  </div>
</template>
