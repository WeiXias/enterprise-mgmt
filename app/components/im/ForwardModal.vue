<script setup lang="ts">
const emit = defineEmits<{ close: []; select: [conversationId: string] }>()
const imStore = useIMStore()

const searchKeyword = ref('')
const filteredConvs = computed(() => {
  if (!searchKeyword.value.trim()) return imStore.conversations
  const kw = searchKeyword.value.toLowerCase()
  return imStore.conversations.filter(c => {
    if (c.type === 'group') return (c.title || '').toLowerCase().includes(kw)
    return c.participant?.name?.toLowerCase().includes(kw)
  })
})
</script>

<template>
  <UModal :model-value="true" @update:model-value="emit('close')">
    <template #header>转发到</template>
    <template #body>
      <div class="space-y-3">
        <div class="relative">
          <UIcon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input v-model="searchKeyword" type="text" placeholder="搜索会话..." class="w-full pl-8 pr-3 h-9 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400" />
        </div>
        <div class="max-h-48 overflow-y-auto space-y-1">
          <button
            v-for="conv in filteredConvs" :key="conv.id"
            class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-brand-50 transition-colors"
            @click="emit('select', conv.id)"
          >
            <div v-if="conv.type === 'group'" class="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-lucide-users" class="w-4 h-4 text-teal-600" />
            </div>
            <div v-else class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span class="text-brand-700 text-xs font-medium">{{ conv.participant?.name?.charAt(0) || '?' }}</span>
            </div>
            <span class="text-sm text-gray-700 truncate">{{ conv.type === 'group' ? conv.title : conv.participant?.name }}</span>
          </button>
          <div v-if="filteredConvs.length === 0" class="text-center py-4 text-xs text-gray-400">没有可用会话</div>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton variant="ghost" color="neutral" @click="emit('close')">取消</UButton>
    </template>
  </UModal>
</template>
