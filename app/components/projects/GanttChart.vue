<script setup lang="ts">
/**
 * 甘特图组件 — 项目任务时间线 + 里程碑标记 + 依赖连线
 */

interface GanttTask {
  id: string; title: string; assignee?: string | null; assigneeName?: string | null
  startDate?: string | null; endDate?: string | null; parentId?: string | null
  progress: number; status: string
}

interface Milestone {
  id: string; name: string; targetDate: string; completedAt?: string | null
}

interface Props {
  tasks: GanttTask[]
  milestones?: Milestone[]
  projectStart?: string
  projectEnd?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  milestones: () => [],
  loading: false
})

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-gray-300',
  in_progress: 'bg-brand-400',
  completed: 'bg-teal-400',
}

function getColor(status: string) { return STATUS_COLORS[status] || 'bg-gray-300' }
function formatDate(v: string | null | undefined) {
  if (!v) return '-'
  return v.slice(5, 10)
}

function computeRange(tasks: GanttTask[]) {
  let minDate = ''
  let maxDate = ''

  tasks.forEach(t => {
    if (t.startDate && (!minDate || t.startDate < minDate)) minDate = t.startDate
    if (t.endDate && (!maxDate || t.endDate > maxDate)) maxDate = t.endDate
  })

  if (!minDate || !maxDate) {
    minDate = new Date().toISOString().slice(0, 10)
    maxDate = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  }

  // 确保 range > 0
  const min = new Date(minDate).getTime()
  const max = new Date(maxDate).getTime()
  const range = Math.max(max - min, 864e5) // at least 1 day

  function taskPosition(task: GanttTask): { left: number; width: number } | null {
    if (!task.startDate || !task.endDate) return null
    const s = new Date(task.startDate).getTime()
    const e = new Date(task.endDate).getTime()
    return {
      left: ((s - min) / range) * 100,
      width: Math.max(((e - s) / range) * 100, 1.5)
    }
  }

  function milestonePosition(m: Milestone): number | null {
    if (!m.targetDate) return null
    return ((new Date(m.targetDate).getTime() - min) / range) * 100
  }

  return { taskPosition, milestonePosition, range, min }
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-8 text-gray-400">马上就好...</div>
    <div v-else-if="tasks.length === 0 && milestones.length === 0" class="text-center py-8 text-gray-400">暂无任务</div>
    <div v-else class="overflow-x-auto">
      <div class="min-w-[600px]">
        <!-- 表头 -->
        <div class="flex items-center gap-3 text-xs text-gray-400 font-medium mb-2 px-2">
          <div class="w-28 flex-shrink-0">任务</div>
          <div class="flex-1">时间线</div>
        </div>

        <!-- 里程碑行 -->
        <template v-if="milestones.length > 0">
          <div class="mb-3">
            <div class="text-[10px] text-gray-400 font-medium mb-1 px-2">里程碑</div>
            <div class="relative h-7 bg-gray-50 rounded-full overflow-visible mb-1 flex items-center">
              <template v-for="m in milestones" :key="m.id">
                <div
                  v-if="computeRange(tasks).milestonePosition(m) !== null"
                  class="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                  :style="{ left: computeRange(tasks).milestonePosition(m)! + '%' }"
                >
                  <div :class="['w-3 h-3 rotate-45 rounded-sm flex-shrink-0', m.completedAt ? 'bg-teal-400' : 'bg-brand-400']" />
                  <span class="text-[9px] mt-1 whitespace-nowrap" :class="m.completedAt ? 'text-teal-600' : 'text-brand-600'">{{ m.name }}</span>
                </div>
              </template>
            </div>
          </div>
        </template>

        <!-- 任务行 -->
        <div v-for="task in tasks" :key="task.id" class="mb-2">
          <div class="flex items-center gap-3 px-2">
            <!-- 任务名称 -->
            <div class="w-28 flex-shrink-0 min-w-0">
              <div class="flex items-center gap-1">
                <UIcon v-if="task.parentId" name="i-lucide-link" class="w-3 h-3 text-gray-300 flex-shrink-0" />
                <p class="text-sm text-gray-800 truncate">{{ task.title }}</p>
              </div>
              <p v-if="task.assigneeName || task.assignee" class="text-[10px] text-gray-400">{{ task.assigneeName || task.assignee }}</p>
            </div>

            <!-- 甘特条 -->
            <div class="flex-1 h-7 bg-gray-50 rounded-full overflow-hidden relative">
              <template v-if="computeRange(tasks).taskPosition(task)">
                <div
                  :class="[getColor(task.status), 'h-full rounded-full flex items-center px-2']"
                  :style="{
                    marginLeft: computeRange(tasks).taskPosition(task)!.left + '%',
                    width: computeRange(tasks).taskPosition(task)!.width + '%'
                  }"
                >
                  <div
                    class="absolute inset-0 bg-black/10 rounded-full"
                    :style="{ width: task.progress + '%' }"
                  />
                  <span class="relative text-[10px] text-white truncate">{{ task.progress }}%</span>
                </div>
              </template>
              <div v-else class="h-full flex items-center px-2 text-[10px] text-gray-400">
                {{ formatDate(task.startDate) }} ~ {{ formatDate(task.endDate) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
