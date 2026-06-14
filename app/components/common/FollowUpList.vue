<script setup lang="ts">
const { getLabel } = useEnum()
interface FollowUp { id: string; type: string; content: string; nextFollowUpAt?: string; user?: { name: string }; createdAt: string }
interface Props { items: FollowUp[]; loading?: boolean; showAddButton?: boolean }
withDefaults(defineProps<Props>(), { loading: false, showAddButton: true })
const emit = defineEmits<{ add: [] }>()

const typeIcons: Record<string, string> = { phone: 'i-lucide-phone', visit: 'i-lucide-map-pin', wechat: 'i-lucide-message-circle', email: 'i-lucide-mail', other: 'i-lucide-more-horizontal' }
function formatDate(v: string) { return v?.slice(0, 16).replace('T', ' ') || '-' }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-content-secondary">跟进记录</h3>
      <UButton v-if="showAddButton" icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('add')">添加</UButton>
    </div>
    <div v-if="loading" class="text-center py-6 text-content-muted">马上就好...</div>
    <div v-else-if="items.length === 0" class="text-center py-6 text-content-muted text-xs">还没有跟进记录，记一笔？</div>
    <div v-else class="space-y-2">
      <div v-for="fu in items" :key="fu.id" class="flex gap-3 p-2 rounded-md hover:bg-surface-hover transition-colors">
        <div class="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
          <UIcon :name="typeIcons[fu.type] || 'i-lucide-more-horizontal'" class="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-content-secondary">{{ fu.content }}</p>
          <p class="text-[10px] text-content-muted mt-1">
            {{ getLabel('FollowUpType', fu.type) || fu.type }}
            <span v-if="fu.user?.name"> · {{ fu.user.name }}</span>
            <span class="ml-1"> · {{ formatDate(fu.createdAt) }}</span>
          </p>
          <p v-if="fu.nextFollowUpAt" class="text-[10px] text-brand-600 mt-0.5">下次跟进：{{ fu.nextFollowUpAt.slice(0, 10) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>