<script setup lang="ts">
definePageMeta({ layout: 'dashboard', title: '消息通知', middleware: ['auth'] })

const notificationStore = useNotificationStore()
const toast = useToast()

const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const isReadFilter = ref<boolean | undefined>(undefined)

const items = computed(() => notificationStore.notifications)
const loading = computed(() => notificationStore.loading)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    remind: 'i-lucide-alarm-clock',
    approval: 'i-lucide-check-circle',
    commission: 'i-lucide-coins',
    system: 'i-lucide-info',
  }
  return icons[type] || 'i-lucide-bell'
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}天前`
  return dateStr.slice(0, 10)
}

async function fetchPage() {
  const result = await notificationStore.fetchNotifications(page.value, isReadFilter.value)
  total.value = result.total
}

async function handleNotificationClick(notif: any) {
  if (!notif.isRead) {
    await notificationStore.markAsRead(notif.id)
    notificationStore.fetchUnreadCount()
  }
  const link = notificationStore.getNotificationLink(notif)
  if (link) navigateTo(link)
}

async function handleMarkAllRead() {
  await notificationStore.markAllAsRead()
  toast.add({ title: '全部标为已读', color: 'success' })
}

function onFilterChange() {
  page.value = 1
  fetchPage()
}

onMounted(fetchPage)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-lg font-medium text-gray-800">消息通知</h1>
        <p class="text-sm text-gray-400 mt-0.5">
          这里有关于客户、合同、项目的重要提醒
        </p>
      </div>
      <UButton
        icon="i-lucide-check-check"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="handleMarkAllRead"
      >
        全部已读
      </UButton>
    </div>

    <!-- 筛选 -->
    <div class="flex items-center gap-2 mb-4">
      <button
        :class="[
          'px-3 py-1.5 text-xs rounded-full transition-colors',
          isReadFilter === undefined ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        ]"
        @click="isReadFilter = undefined; onFilterChange()"
      >
        全部
      </button>
      <button
        :class="[
          'px-3 py-1.5 text-xs rounded-full transition-colors',
          isReadFilter === false ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        ]"
        @click="isReadFilter = false; onFilterChange()"
      >
        未读
      </button>
      <button
        :class="[
          'px-3 py-1.5 text-xs rounded-full transition-colors',
          isReadFilter === true ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        ]"
        @click="isReadFilter = true; onFilterChange()"
      >
        已读
      </button>
    </div>

    <!-- 通知列表 -->
    <div v-if="loading" class="text-center py-12 text-gray-400">加载中...</div>
    <div v-else-if="items.length === 0" class="warm-card text-center py-10">
      <UIcon name="i-lucide-bell-off" class="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-400">暂时没有通知</p>
    </div>
    <div v-else class="space-y-1.5">
      <div
        v-for="notif in items"
        :key="notif.id"
        :class="[
          'warm-card !py-3 !px-4 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3',
          !notif.isRead ? 'border-brand-200' : ''
        ]"
        @click="handleNotificationClick(notif)"
      >
        <div :class="[
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          notif.isRead ? 'bg-gray-100' : 'bg-brand-100'
        ]">
          <UIcon
            :name="getNotificationIcon(notif.type)"
            class="w-4 h-4"
            :class="notif.isRead ? 'text-gray-400' : 'text-brand-600'"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span :class="['text-sm', notif.isRead ? 'text-gray-500' : 'text-gray-800 font-medium']">
              {{ notif.title }}
            </span>
            <span v-if="!notif.isRead" class="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
          </div>
          <p v-if="notif.content" class="text-xs text-gray-400 mt-0.5 line-clamp-1">{{ notif.content }}</p>
        </div>
        <div class="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">
          {{ formatTime(notif.createdAt) }}
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <span class="text-xs text-gray-400">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex gap-1">
        <UButton :disabled="page <= 1" variant="ghost" color="neutral" size="xs" @click="page--; fetchPage()">上一页</UButton>
        <UButton :disabled="page >= totalPages" variant="ghost" color="neutral" size="xs" @click="page++; fetchPage()">下一页</UButton>
      </div>
    </div>
  </div>
</template>
