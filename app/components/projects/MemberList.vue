<script setup lang="ts">
interface Member { id?: string; userId: string; name?: string; role: string }
interface Props { items: Member[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ remove: [userId: string]; add: [] }>()
const roleLabels: Record<string, string> = { leader: '负责人', member: '成员' }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-medium text-stone-700">项目成员</h3><UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('add')">添加</UButton></div>
    <div v-if="loading" class="text-center py-4 text-stone-400">加载中...</div>
    <div v-else-if="items.length === 0" class="text-xs text-stone-400 py-3 text-center">暂无成员</div>
    <div v-else class="space-y-1">
      <div v-for="m in items" :key="m.userId" class="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center"><span class="text-amber-700 text-[10px]">{{ (m.name || '?').charAt(0) }}</span></div>
          <span class="text-sm text-stone-700">{{ m.name || m.userId }}</span><span class="text-[10px] text-stone-400">{{ roleLabels[m.role] || m.role }}</span>
        </div>
        <UButton icon="i-lucide-x" variant="ghost" color="error" size="xs" @click="$emit('remove', m.userId)" />
      </div>
    </div>
  </div>
</template>
