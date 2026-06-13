<script setup lang="ts">
const { getLabel } = useEnum()
interface Payment { id: string; amount: number; paymentDate: string; paymentMethod?: string; remark?: string }
interface Props { items: Payment[]; loading?: boolean }
withDefaults(defineProps<Props>(), { loading: false })
const emit = defineEmits<{ delete: [id: string]; add: [] }>()
function formatMoney(v: number) { if (!v) return '-'; return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }
function formatDate(v: string) { return v?.slice(0, 10) || '-' }
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm text-gray-500">收款记录 ({{ items.length }})</span>
      <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="$emit('add')">登记</UButton>
    </div>
    <div v-if="loading" class="text-center py-6 text-gray-400">加载中...</div>
    <div v-else-if="items.length === 0" class="text-center py-6 text-gray-400 text-xs">暂无收款记录</div>
    <div v-else class="space-y-2">
      <div v-for="pay in items" :key="pay.id" class="warm-card flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
        <div class="flex-1 flex items-center gap-4 text-sm"><span class="text-gray-700 font-medium">{{ formatMoney(pay.amount) }}</span><span class="text-xs text-gray-400">{{ formatDate(pay.paymentDate) }}</span><span v-if="pay.paymentMethod" class="text-xs text-gray-400">{{ getLabel('PaymentMethod', pay.paymentMethod) || pay.paymentMethod }}</span></div>
        <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="$emit('delete', pay.id)" />
      </div>
    </div>
  </div>
</template>
