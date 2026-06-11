<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '项目日历', middleware: ['auth'] })

const toast = useToast()
const { $api } = useNuxtApp()
const dayjs = useDayjs()

const currentMonth = ref(dayjs().format('YYYY-MM'))
const selectedDate = ref<string | null>(null)
const selectedDateTasks = ref<any[]>([])
const viewMode = ref<'month' | 'week'>('month')
const currentWeekStart = ref(dayjs().startOf('week').format('YYYY-MM-DD'))

// 筛选
const projectFilter = ref('')
const projectOptions = ref<any[]>([])

// 日历数据
const calendarTasks = ref<Record<string, any[]>>({})
const loading = ref(false)

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function goPrevMonth() { currentMonth.value = dayjs(currentMonth.value).subtract(1, 'month').format('YYYY-MM') }
function goNextMonth() { currentMonth.value = dayjs(currentMonth.value).add(1, 'month').format('YYYY-MM') }
function goPrevWeek() { currentWeekStart.value = dayjs(currentWeekStart.value).subtract(1, 'week').format('YYYY-MM-DD') }
function goNextWeek() { currentWeekStart.value = dayjs(currentWeekStart.value).add(1, 'week').format('YYYY-MM-DD') }
function goToday() { currentMonth.value = dayjs().format('YYYY-MM'); currentWeekStart.value = dayjs().startOf('week').format('YYYY-MM-DD') }

async function fetchCalendar() {
  loading.value = true
  try {
    const params: any = { month: currentMonth.value }
    if (projectFilter.value) params.projectId = projectFilter.value
    const res = await $api('/api/projects/tasks/calendar', { params }) as any
    if (res?.code === 0) calendarTasks.value = res.data || {}
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function fetchProjects() {
  try {
    const res = await $api('/api/projects', { params: { pageSize: 100 } }) as any
    if (res?.code === 0) projectOptions.value = res.data.items
  } catch { /* ignore */ }
}

const monthDays = computed(() => {
  const start = dayjs(currentMonth.value).startOf('month')
  const end = dayjs(currentMonth.value).endOf('month')
  const days: dayjs.Dayjs[] = []
  // padding before first day
  const startDay = start.day() // 0=Sun
  const padStart = startDay === 0 ? 6 : startDay - 1 // Monday=0
  for (let i = padStart - 1; i >= 0; i--) days.push(start.subtract(i + 1, 'day'))
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) days.push(d)
  return days
})

const weekDays = computed(() => {
  const start = dayjs(currentWeekStart.value)
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'))
})

function dateKey(d: dayjs.Dayjs) { return d.format('YYYY-MM-DD') }
function taskCount(date: string) { return (calendarTasks.value[date] || []).length }
function priorityColor(p: string) {
  return { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-stone-300' }[p] || 'bg-stone-300'
}
function statusColor(s: string) {
  return { todo: 'ring-stone-300', in_progress: 'ring-blue-400', completed: 'ring-teal-400' }[s] || 'ring-stone-300'
}

function selectDate(d: dayjs.Dayjs) {
  selectedDate.value = dateKey(d)
  selectedDateTasks.value = calendarTasks.value[selectedDate.value] || []
}

watch([currentMonth, projectFilter], () => fetchCalendar())
onMounted(() => { fetchProjects(); fetchCalendar() })
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-stone-800">项目日历</h1>
        <p class="text-sm text-stone-400 mt-0.5">按日期查看所有项目任务</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="projectFilter" class="px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 bg-white">
          <option value="">全部项目</option>
          <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <div class="flex items-center bg-stone-100 rounded-lg p-0.5">
          <button :class="['px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'month' ? 'bg-white shadow-sm text-stone-700' : 'text-stone-400']" @click="viewMode = 'month'">月</button>
          <button :class="['px-3 py-1 text-xs rounded-md transition-colors', viewMode === 'week' ? 'bg-white shadow-sm text-stone-700' : 'text-stone-400']" @click="viewMode = 'week'">周</button>
        </div>
      </div>
    </div>

    <div class="flex gap-6">
      <!-- 主日历 -->
      <div class="flex-1">
        <!-- 导航 -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UButton icon="i-lucide-chevron-left" variant="ghost" color="neutral" size="xs" @click="viewMode === 'month' ? goPrevMonth() : goPrevWeek()" />
            <span class="text-sm font-medium text-stone-700 w-28 text-center">{{ viewMode === 'month' ? dayjs(currentMonth).format('YYYY年 M月') : dayjs(currentWeekStart).format('M月D日') + ' - ' + dayjs(currentWeekStart).add(6, 'day').format('M月D日') }}</span>
            <UButton icon="i-lucide-chevron-right" variant="ghost" color="neutral" size="xs" @click="viewMode === 'month' ? goNextMonth() : goNextWeek()" />
          </div>
          <UButton variant="ghost" color="neutral" size="xs" @click="goToday">今天</UButton>
        </div>

        <!-- 月视图 -->
        <div v-if="viewMode === 'month'">
          <div class="grid grid-cols-7 gap-px bg-stone-100 rounded-lg overflow-hidden">
            <div v-for="wd in WEEKDAYS" :key="wd" class="text-center py-2 text-xs text-stone-400 font-medium bg-white">{{ wd }}</div>
            <div
              v-for="d in monthDays" :key="dateKey(d)"
              :class="['min-h-[80px] p-1 bg-white cursor-pointer hover:bg-stone-50 transition-colors border-t border-stone-100', dateKey(d) === selectedDate ? 'ring-2 ring-amber-400 ring-inset' : '', d.month() !== dayjs(currentMonth).month() ? 'opacity-30' : '']"
              @click="selectDate(d)"
            >
              <div class="flex items-center justify-between mb-0.5">
                <span :class="['text-xs w-5 h-5 flex items-center justify-center rounded-full', dateKey(d) === dayjs().format('YYYY-MM-DD') ? 'bg-amber-400 text-white' : 'text-stone-500']">{{ d.date() }}</span>
                <span v-if="taskCount(dateKey(d))" class="text-[10px] text-amber-600 font-medium">{{ taskCount(dateKey(d)) }}</span>
              </div>
              <div class="space-y-0.5">
                <div
                  v-for="(t, i) in (calendarTasks[dateKey(d)] || []).slice(0, 3)" :key="i"
                  :class="['text-[9px] px-1 py-0.5 rounded truncate text-white', priorityColor(t.priority)]"
                >{{ t.title }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 周视图 -->
        <div v-if="viewMode === 'week'">
          <div class="grid grid-cols-7 gap-px bg-stone-100 rounded-lg overflow-hidden">
            <div v-for="d in weekDays" :key="dateKey(d)" :class="['min-h-[200px] p-2 bg-white cursor-pointer hover:bg-stone-50 transition-colors', dateKey(d) === selectedDate ? 'ring-2 ring-amber-400 ring-inset' : '']" @click="selectDate(d)">
              <div class="text-center mb-2">
                <p class="text-[10px] text-stone-400">{{ WEEKDAYS[d.day() === 0 ? 6 : d.day() - 1] }}</p>
                <p :class="['text-sm w-6 h-6 mx-auto flex items-center justify-center rounded-full', dateKey(d) === dayjs().format('YYYY-MM-DD') ? 'bg-amber-400 text-white' : 'text-stone-700']">{{ d.date() }}</p>
              </div>
              <div class="space-y-1">
                <div v-for="(t, i) in (calendarTasks[dateKey(d)] || []).slice(0, 6)" :key="i" :class="['text-[10px] px-1.5 py-0.5 rounded truncate', priorityColor(t.priority).replace('bg-', 'bg-opacity-20 bg-'), 'text-stone-600 border-l-2', statusColor(t.status).replace('ring-', 'border-')]">{{ t.title }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 侧边：选中日期的任务 -->
      <div v-if="selectedDate" class="w-64 flex-shrink-0">
        <div class="warm-card sticky top-6">
          <h3 class="text-sm font-medium text-stone-700 mb-2">{{ selectedDate }}</h3>
          <div v-if="selectedDateTasks.length === 0" class="text-xs text-stone-400 py-3 text-center">这天没有任务</div>
          <div v-else class="space-y-2">
            <div v-for="t in selectedDateTasks" :key="t.id" class="p-2 rounded-lg bg-stone-50 text-xs">
              <div class="flex items-center gap-1 mb-0.5">
                <div :class="['w-1.5 h-1.5 rounded-full', priorityColor(t.priority)]" />
                <span class="text-stone-700 truncate">{{ t.title }}</span>
              </div>
              <div class="flex items-center gap-2 text-stone-400">
                <span>{{ t.projectName || '-' }}</span>
                <span v-if="t.assigneeName">{{ t.assigneeName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
