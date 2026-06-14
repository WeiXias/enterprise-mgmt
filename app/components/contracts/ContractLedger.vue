<script setup lang="ts">
const { getLabel } = useEnum()
interface LedgerItem { contractNo: string; name: string; customer: string; totalAmount: number; receivedAmount: number; unreceivedAmount: number; paymentProgress: number; nextPaymentDate?: string; nextPaymentAmount?: number; status: string }
interface Props { items: LedgerItem[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
function formatMoney(v: number) { if (!v) return '-'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function formatDate(v?: string) { return v?.slice(0, 10) || '-' }
const statusColors: Record<string, string> = { draft: 'bg-surface-hover text-content-secondary', approved: 'bg-brand-50 text-brand-600', in_progress: 'bg-brand-50 text-brand-700', completed: 'bg-teal-50 text-teal-700', terminated: 'bg-red-50 text-red-600' }
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-6 text-content-muted">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-6 text-content-muted text-xs">暂无数据</div>
    <div v-else class="space-y-1.5">
      <div v-for="item in items" :key="item.contractNo" class="em-card flex items-center gap-3 !py-3 !px-4">
        <div :class="['w-1 h-9 rounded-full flex-shrink-0', item.paymentProgress >= 100 ? 'bg-teal-400' : item.unreceivedAmount > 0 ? 'bg-red-400' : 'bg-brand-400']" />
        <div class="flex-[2] min-w-0"><p class="text-xs text-content-muted truncate">{{ item.contractNo }}</p><p class="text-sm text-content-primary truncate">{{ item.name }}</p></div>
        <div class="flex-1 text-sm text-content-secondary truncate">{{ item.customer }}</div>
        <div class="flex-1 text-sm text-right">{{ formatMoney(item.totalAmount) }}</div>
        <div class="flex-1 text-sm text-teal-600 text-right">{{ formatMoney(item.receivedAmount) }}</div>
        <div class="flex-1 text-sm text-right" :class="item.unreceivedAmount > 0 ? 'text-red-500 font-medium' : 'text-content-muted'">{{ formatMoney(item.unreceivedAmount) }}</div>
        <div class="w-20 flex items-center gap-1">
          <div class="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden"><div :class="['h-full rounded-full', item.paymentProgress >= 100 ? 'bg-teal-400' : 'bg-brand-400']" :style="{ width: item.paymentProgress + '%' }" /></div>
          <span class="text-xs text-content-muted w-8">{{ Math.round(item.paymentProgress) }}%</span>
        </div>
        <span :class="['text-[10px] px-1.5 py-0.5 rounded-full', statusColors[item.status] || '']">{{ getLabel('ContractStatus', item.status) || item.status }}</span>
      </div>
    </div>
  </div>
</template>
