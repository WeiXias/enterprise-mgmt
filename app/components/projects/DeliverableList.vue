<script setup lang="ts">
interface Deliverable { id: string; name: string; description?: string; filePath?: string; status: string; createdAt: string }
interface Props { items: Deliverable[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ add: []; upload: [id: string]; 'status-change': [id: string, status: string] }>()
const { getLabel } = useEnum()

const statusColors: Record<string, string> = { pending: 'bg-surface-hover text-content-muted', submitted: 'bg-brand-50 text-brand-600', accepted: 'bg-teal-50 text-teal-700', rejected: 'bg-red-50 text-red-600' }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-medium text-content-secondary">交付物</h3><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('add')">添加</UButton></div>
    <CommonFileUpload v-if="items.length > 0" :upload-url="''" :files="items.map(d => ({ id: d.id, fileName: d.name, fileSize: 0, fileUrl: d.filePath, createdAt: d.createdAt }))" @delete="(f: any) => {}" />
    <div v-else-if="!loading" class="text-xs text-content-muted py-3 text-center">暂无交付物</div>
    <div v-if="items.length > 0" class="mt-2 space-y-1"><div v-for="d in items" :key="d.id" class="flex items-center justify-between p-2 rounded-md hover:bg-surface-hover text-xs"><div><span class="text-content-secondary">{{ d.name }}</span><span :class="['ml-2 text-[10px] px-1 py-0.5 rounded-full', statusColors[d.status] || '']">{{ getLabel('DeliverableStatus', d.status) || d.status }}</span></div></div></div>
  </div>
</template>
