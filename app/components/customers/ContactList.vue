<script setup lang="ts">
defineProps<{
  contacts: any[]
}>()

const emit = defineEmits<{
  delete: [contactId: string]
  add: []
}>()
</script>

<template>
  <div class="em-card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-content-secondary">联系人</h3>
      <UButton icon="i-lucide-plus" variant="ghost" color="primary" size="xs" @click="$emit('add')">添加</UButton>
    </div>
    <div v-if="!contacts?.length" class="text-xs text-content-muted py-4 text-center">暂无联系人</div>
    <div v-else class="space-y-2">
      <div
        v-for="contact in contacts"
        :key="contact.id"
        class="flex items-center gap-3 p-2 rounded-md hover:bg-surface-hover transition-colors group"
      >
        <div class="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
          <span class="text-brand-700 text-xs">{{ contact.name?.charAt(0) }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-sm text-content-secondary">{{ contact.name }}</span>
            <span v-if="contact.isPrimary" class="text-[9px] px-1 py-0.5 rounded bg-brand-50 text-brand-600">主要</span>
            <span v-if="contact.position" class="text-xs text-content-muted">{{ contact.position }}</span>
          </div>
          <div class="flex gap-3 text-xs text-content-muted">
            <span v-if="contact.phone">{{ contact.phone }}</span>
            <span v-if="contact.email">{{ contact.email }}</span>
          </div>
        </div>
        <button
          class="w-6 h-6 flex items-center justify-center rounded text-content-muted opacity-0 group-hover:opacity-100 hover:text-danger-500 hover:bg-danger-50 transition-all shrink-0"
          title="删除联系人"
          @click="$emit('delete', contact.id)"
        ><UIcon name="i-lucide-x" class="w-3.5 h-3.5" /></button>
      </div>
    </div>
  </div>
</template>
