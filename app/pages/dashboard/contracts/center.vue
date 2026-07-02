<script setup lang="ts">
// 合同中心已合并到合同列表页（index.vue），此页面仅作为重定向
definePageMeta({ layout: 'dashboard', title: '合同', middleware: ['auth'], watermark: true })
await navigateTo('/dashboard/contracts', { replace: true })
</script>
<template>
  <div class="flex items-center justify-center py-20 text-content-muted">跳转中...</div>
</template>
