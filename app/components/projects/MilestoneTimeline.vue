<script setup lang="ts">
interface Milestone {
  id: string; name: string; description?: string; targetDate: string;
  completedAt?: string | null; sortOrder: number
}

const props = defineProps<{
  milestones: Milestone[]
  loading?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string, completed: boolean]
  delete: [id: string]
}>()

function isCompleted(m: Milestone) { return !!m.completedAt }
function formatDate(v: string) { return v?.slice(0, 10) || '-' }
function isOverdue(m: Milestone) {
  if (isCompleted(m)) return false
  return new Date(m.targetDate) < new Date()
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-4 text-content-muted text-xs">加载中...</div>
    <div v-else-if="milestones.length === 0" class="text-center py-4 text-content-muted text-xs">暂无里程碑</div>
    <div v-else class="relative">
      <!-- 时间线竖线 -->
      <div class="absolute left-[11px] top-2 bottom-2 w-px bg-line" />
      <div v-for="m in milestones" :key="m.id" class="relative pl-7 pb-4 last:pb-0">
        <!-- 节点圆点 -->
        <div
          :class="[
            'absolute left-[5px] top-1 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors',
            isCompleted(m) ? 'bg-teal-400 border-teal-400' : isOverdue(m) ? 'bg-danger-50 border-red-400' : 'bg-surface-card border-line'
          ]"
        >
          <UIcon v-if="isCompleted(m)" name="i-lucide-check" class="w-2.5 h-2.5 text-white absolute -top-px -left-px" />
        </div>
        <!-- 内容 -->
        <div
          :class="[
            'flex items-start justify-between gap-2 cursor-pointer rounded-md p-1.5 -ml-1.5 hover:bg-surface-hover transition-colors',
            isCompleted(m) ? 'opacity-60' : ''
          ]"
          @click="editable && emit('toggle', m.id, !isCompleted(m))"
        >
          <div class="min-w-0">
            <p :class="['text-sm', isCompleted(m) ? 'text-content-muted line-through' : 'text-content-secondary']">{{ m.name }}</p>
            <p class="text-xs mt-0.5" :class="isOverdue(m) && !isCompleted(m) ? 'text-danger-500 font-medium' : 'text-content-muted'">
              <UIcon name="i-lucide-calendar" class="w-3 h-3 inline mr-0.5" />
              {{ formatDate(m.targetDate) }}
              <span v-if="isOverdue(m) && !isCompleted(m)" class="ml-1">已逾期</span>
              <span v-if="isCompleted(m)" class="ml-1 text-teal-500">已完成</span>
            </p>
          </div>
          <UButton
            v-if="editable"
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="xs"
            class="opacity-0 group-hover:opacity-100 flex-shrink-0"
            @click.stop="emit('delete', m.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
