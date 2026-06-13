<script setup lang="ts">
interface Member { id?: string; userId: string; name?: string; role: string }
interface Props { items: Member[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ remove: [userId: string]; add: [] }>()
const { getLabel } = useEnum()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-medium text-gray-700">项目成员</h3><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('add')">添加</UButton></div>
    <div v-if="loading" class="text-center py-4 text-gray-400">加载中...</div>
    <div v-else-if="items.length === 0" class="text-xs text-gray-400 py-3 text-center">暂无成员</div>
    <div v-else class="space-y-1">
      <div v-for="m in items" :key="m.userId" class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center"><span class="text-brand-700 text-[10px]">{{ (m.name || '?').charAt(0) }}</span></div>
          <span class="text-sm text-gray-700">{{ m.name || m.userId }}</span><span class="text-[10px] text-gray-400">{{ getLabel('ProjectMemberRole', m.role) || m.role }}</span>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="$emit('remove', m.userId)" />
      </div>
    </div>
  </div>
</template>
