<script setup lang="ts">
interface LedgerItem { contractNo: string; name: string; customer: string; totalAmount: number; receivedAmount: number; unreceivedAmount: number; paymentProgress: number; nextPaymentDate?: string; nextPaymentAmount?: number; status: string }
interface Props { items: LedgerItem[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
function formatMoney(v: number) { if (!v) return '-'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function formatDate(v?: string) { return v?.slice(0, 10) || '-' }
const statusLabels: Record<string, string> = { draft: '草稿', approved: '已审批', in_progress: '执行中', completed: '已完成', terminated: '已终止' }
const statusColors: Record<string, string> = { draft: 'bg-stone-100 text-stone-600', approved: 'bg-blue-50 text-blue-600', in_progress: 'bg-amber-50 text-amber-700', completed: 'bg-teal-50 text-teal-700', terminated: 'bg-red-50 text-red-600' }
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-6 text-stone-400">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-6 text-stone-400 text-xs">暂无数据</div>
    <div v-else class="space-y-1.5">
      <div v-for="item in items" :key="item.contractNo" class="warm-card flex items-center gap-3 !py-3 !px-4">
        <div :class="['w-1 h-9 rounded-full flex-shrink-0', item.paymentProgress >= 100 ? 'bg-teal-400' : item.unreceivedAmount > 0 ? 'bg-red-400' : 'bg-amber-400']" />
        <div class="flex-[2] min-w-0"><p class="text-xs text-stone-500 truncate">{{ item.contractNo }}</p><p class="text-sm text-stone-800 truncate">{{ item.name }}</p></div>
        <div class="flex-1 text-sm text-stone-700 truncate">{{ item.customer }}</div>
        <div class="flex-1 text-sm text-right">{{ formatMoney(item.totalAmount) }}</div>
        <div class="flex-1 text-sm text-teal-600 text-right">{{ formatMoney(item.receivedAmount) }}</div>
        <div class="flex-1 text-sm text-right" :class="item.unreceivedAmount > 0 ? 'text-red-500 font-medium' : 'text-stone-400'">{{ formatMoney(item.unreceivedAmount) }}</div>
        <div class="w-20 flex items-center gap-1">
          <div class="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden"><div :class="['h-full rounded-full', item.paymentProgress >= 100 ? 'bg-teal-400' : 'bg-amber-400']" :style="{ width: item.paymentProgress + '%' }" /></div>
          <span class="text-xs text-stone-500 w-8">{{ Math.round(item.paymentProgress) }}%</span>
        </div>
        <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusColors[item.status] || '']">{{ statusLabels[item.status] || item.status }}</span>
      </div>
    </div>
  </div>
</template>
