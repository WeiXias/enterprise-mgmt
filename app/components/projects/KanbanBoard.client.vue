<script setup lang="ts">
// 客户端渲染（HTML5 Drag & Drop 需要浏览器环境）
import { ref, computed } from 'vue'

const props = defineProps<{
  tasks: any[]
  currentUserId?: string
}>()

const emit = defineEmits<{
  'update:status': [taskId: string, newStatus: string]
  'click': [task: any]
}>()

const statusColumns = [
  { status: 'todo', label: '待办', color: 'bg-gray-300' },
  { status: 'in_progress', label: '进行中', color: 'bg-amber-400' },
  { status: 'completed', label: '已完成', color: 'bg-teal-400' },
]

const tasksByStatus = computed(() => {
  const map: Record<string, any[]> = { todo: [], in_progress: [], completed: [] }
  for (const t of props.tasks) {
    if (map[t.status]) map[t.status]!.push(t)
    else map.todo!.push(t)
  }
  return map
})

function getPriorityColor(priority: string): string {
  const map: Record<string, string> = { high: 'text-red-500', medium: 'text-amber-500', low: 'text-gray-400' }
  return map[priority] || 'text-gray-400'
}

function onDragStart(e: DragEvent, task: any) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, fromStatus: task.status }))
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDrop(e: DragEvent, toStatus: string) {
  e.preventDefault()
  if (!e.dataTransfer) return
  try {
    const { taskId, fromStatus } = JSON.parse(e.dataTransfer.getData('text/plain'))
    if (fromStatus !== toStatus) {
      emit('update:status', taskId, toStatus)
    }
  } catch { /* ignore parse errors */ }
}
</script>

<template>
  <div class="grid grid-cols-3 gap-4 h-full">
    <div v-for="col in statusColumns" :key="col.status" class="flex flex-col">
      <div class="flex items-center gap-2 mb-3 px-2">
        <div :class="['w-2 h-2 rounded-full', col.color]" />
        <span class="text-sm text-gray-600">{{ col.label }}</span>
        <span class="text-xs text-gray-400 ml-auto">{{ tasksByStatus[col.status]!.length }}</span>
      </div>
      <div
        class="flex-1 overflow-y-auto space-y-2 p-1 rounded-lg min-h-[200px]"
        :class="col.status === 'completed' ? '' : 'bg-gray-50/50'"
        @dragover="onDragOver"
        @drop="(e) => onDrop(e, col.status)"
      >
        <div
          v-for="task in tasksByStatus[col.status]!"
          :key="task.id"
          draggable="true"
          class="warm-card p-3 cursor-pointer hover:shadow-sm transition-shadow"
          :class="task.status === 'completed' ? 'opacity-60' : ''"
          @click="emit('click', task)"
          @dragstart="(e) => onDragStart(e, task)"
        >
          <p class="text-sm text-gray-800 mb-1.5" :class="task.status === 'completed' ? 'line-through' : ''">{{ task.name }}</p>
          <div class="flex items-center gap-2 text-xs text-gray-400">
            <span v-if="task.assigneeName"><UIcon name="i-lucide-user" class="w-3 h-3 inline-block mr-0.5" />{{ task.assigneeName }}</span>
            <span v-if="task.priority" :class="getPriorityColor(task.priority)"><UIcon name="i-lucide-flag" class="w-3 h-3 inline-block mr-0.5" />{{ task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低' }}</span>
            <span v-if="task.endDate" class="ml-auto">{{ task.endDate?.slice(0, 10) }}</span>
          </div>
        </div>
        <div v-if="tasksByStatus[col.status]!.length === 0" class="text-xs text-gray-300 text-center py-8">
          拖任务到这里
        </div>
      </div>
    </div>
  </div>
</template>
