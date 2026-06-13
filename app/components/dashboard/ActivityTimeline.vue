<script setup lang="ts">
interface Activity { id: string; type: string; description: string; user: string; createdAt: string }
interface Props { items: Activity[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })

function formatTime(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr); const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'; if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60); if (diffHour < 24) return `${diffHour}小时前`
  return dateStr.slice(0, 10)
}

const typeIcons: Record<string, string> = {
  customer_created: 'i-lucide-user-plus', opportunity_won: 'i-lucide-trophy',
  contract_signed: 'i-lucide-pen-line', payment_received: 'i-lucide-dollar-sign',
}
function getIcon(type: string) { return typeIcons[type] || 'i-lucide-circle-dot' }
</script>

<template>
  <div class="warm-card">
    <h3 class="text-sm font-medium text-gray-700 mb-3">最近动态</h3>
    <div v-if="loading" class="space-y-2"><div v-for="i in 5" :key="i" class="h-8 bg-gray-200 rounded animate-pulse" /></div>
    <div v-else-if="items.length === 0" class="text-xs text-gray-400 py-4 text-center">暂无动态</div>
    <div v-else class="space-y-3">
      <div v-for="act in items" :key="act.id" class="flex gap-3" >
        <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <UIcon :name="getIcon(act.type)" class="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div class="min-w-0">
          <p class="text-sm text-gray-700">{{ act.description }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">{{ act.user }} · {{ formatTime(act.createdAt) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
