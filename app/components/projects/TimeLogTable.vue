<script setup lang="ts">
const { getLabel } = useEnum()

interface TimeLog {
  id: string; date: string; hours: number; description?: string
  status: string; taskId?: string; taskName?: string
  userId: string; userName?: string
}

const props = defineProps<{
  logs: TimeLog[]
  members?: { userId?: string; id?: string; name: string }[]
  tasks?: { id: string; name: string; title?: string }[]
  loading?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:status': [id: string, status: string]
  delete: [id: string]
}>()


const statusColors: Record<string, string> = {
  draft: 'bg-surface-hover text-content-muted',
  submitted: 'bg-brand-50 text-brand-600',
  approved: 'bg-teal-50 text-teal-600',
  rejected: 'bg-red-50 text-red-500',
}

function getMemberName(userId: string) {
  const m = props.members?.find(m => (m.userId || m.id) === userId)
  return m?.name || userId?.slice(0, 6) || '-'
}

function groupByDate(logs: TimeLog[]): { date: string; items: TimeLog[]; totalHours: number }[] {
  const map = new Map<string, { items: TimeLog[]; totalHours: number }>()
  for (const l of logs) {
    const key = l.date
    if (!map.has(key)) map.set(key, { items: [], totalHours: 0 })
    const entry = map.get(key)!
    entry.items.push(l)
    entry.totalHours += l.hours
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, v]) => ({ date, items: v.items, totalHours: v.totalHours }))
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-8 text-content-muted text-xs">加载中...</div>
    <div v-else-if="logs.length === 0" class="text-center py-8 text-content-muted text-xs">暂无工时记录</div>
    <div v-else class="space-y-3">
      <div v-for="group in groupByDate(logs)" :key="group.date">
        <div class="flex items-center gap-2 text-xs text-content-muted mb-1.5">
          <UIcon name="i-lucide-calendar" class="w-3 h-3" />
          <span>{{ group.date }}</span>
          <span class="text-content-muted">|</span>
          <span>合计 {{ group.totalHours }}h</span>
        </div>
        <div class="space-y-1">
          <div v-for="l in group.items" :key="l.id" class="flex items-center gap-2 p-2 rounded-md hover:bg-surface-hover transition-colors">
            <div class="flex-shrink-0 w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center">
              <span class="text-brand-700 text-xs">{{ (l.userName || getMemberName(l.userId)).charAt(0) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1">
                <span class="text-sm text-content-secondary truncate">{{ l.userName || getMemberName(l.userId) }}</span>
                <span class="text-xs text-content-muted">{{ l.hours }}h</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-content-muted">
                <span v-if="l.taskName" class="truncate">{{ l.taskName }}</span>
                <span v-if="l.description" class="truncate">{{ l.description }}</span>
              </div>
            </div>
            <span :class="['text-[10px] px-1 py-0.5 rounded-full flex-shrink-0', statusColors[l.status] || '']">{{ getLabel('TimeLogStatus', l.status) || l.status }}</span>
            <div v-if="editable" class="flex gap-0.5 flex-shrink-0">
              <UButton v-if="l.status === 'draft'" icon="i-lucide-send" variant="ghost" color="info" size="xs" @click="emit('update:status', l.id, 'submitted')" />
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" @click="emit('delete', l.id)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
