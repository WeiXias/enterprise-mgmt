<script setup lang="ts">
interface Task { id: string; name: string; assigneeId?: string; assigneeName?: string; priority: string; status: string; endDate?: string }
interface Props { tasks: Task[]; members?: { userId: string; name: string }[]; loading?: boolean }
withDefaults(defineProps<Props>(), { members: () => [], loading: false })
const emit = defineEmits<{ 'status-change': [taskId: string, newStatus: string]; 'task-click': [task: Task]; delete: [taskId: string] }>()

const { getLabel } = useEnum()

const statuses = ['todo', 'in_progress', 'completed'] as const
const priorityColors: Record<string, string> = { low: 'bg-surface-hover text-content-muted', medium: 'bg-brand-50 text-brand-700', high: 'bg-red-50 text-red-600' }

function tasksByStatus(status: string) { return props.tasks.filter(t => t.status === status) }
function getAssigneeName(task: Task) { return props.members?.find(m => m.userId === task.assigneeId)?.name || task.assigneeName || '-' }
const props = defineProps<Props>()
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <div v-for="status in statuses" :key="status">
      <div class="text-xs text-content-muted mb-2 font-medium">{{ getLabel('TaskStatus', status) }} ({{ tasksByStatus(status).length }})</div>
      <div class="space-y-2">
        <div v-for="t in tasksByStatus(status)" :key="t.id" class="em-card p-3 text-sm cursor-pointer hover:shadow-sm transition-shadow" @click="$emit('task-click', t)">
          <div class="flex items-center justify-between mb-1"><span class="font-medium text-content-secondary">{{ t.name }}</span><span :class="['text-[10px] px-1 py-0.5 rounded-full', priorityColors[t.priority] || '']">{{ getLabel('TaskPriority', t.priority) || '中' }}</span></div>
          <div class="flex items-center justify-between text-xs text-content-muted"><span>{{ getAssigneeName(t) }}</span><span v-if="t.endDate">{{ t.endDate }}</span></div>
          <div class="flex gap-1 mt-2 pt-2 border-t border-line-light">
            <template v-if="status === 'todo'"><UButton size="xs" variant="ghost" color="info" label="开始" @click.stop="$emit('status-change', t.id, 'in_progress')" /></template>
            <template v-if="status === 'in_progress'"><UButton size="xs" variant="ghost" color="success" label="完成" @click.stop="$emit('status-change', t.id, 'completed')" /><UButton size="xs" variant="ghost" color="warning" label="退回" @click.stop="$emit('status-change', t.id, 'todo')" /></template>
            <UButton size="xs" variant="ghost" color="error" label="删除" @click.stop="$emit('delete', t.id)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
